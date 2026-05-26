"use server";

import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/server/services/stripe";
import { auth } from "@/server/auth/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clamp, generateOrderNumber, resolveVariantPrice } from "@/lib/utils";
import { getCart } from "@/server/actions/cart";
import { checkoutSchema, type CheckoutInput } from "@/schemas/checkout";

type CreateCheckoutResult =
  | {
      ok: true;
      clientSecret: string;
      orderNumber: string;
      total: number;
      currency: string;
    }
  | { ok: false; error: string };

const SHIPPING_FEE = 0; // livraison offerte (joaillerie)
const TAX = 0; // prix affichés TTC

/**
 * Valide un coupon et renvoie la remise (en centimes) applicable au sous-total.
 */
async function computeDiscount(
  code: string | undefined,
  subtotal: number
): Promise<{ discount: number; couponId: string | null; error?: string }> {
  if (!code) return { discount: 0, couponId: null };

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    return { discount: 0, couponId: null, error: "Code promo invalide." };
  }
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    return { discount: 0, couponId: null, error: "Code promo non actif." };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { discount: 0, couponId: null, error: "Code promo expiré." };
  }
  if (
    coupon.maxRedemptions != null &&
    coupon.timesRedeemed >= coupon.maxRedemptions
  ) {
    return { discount: 0, couponId: null, error: "Code promo épuisé." };
  }
  if (coupon.minOrder != null && subtotal < coupon.minOrder) {
    return { discount: 0, couponId: null, error: "Montant minimum non atteint." };
  }

  const discount =
    coupon.type === "PERCENTAGE"
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal);

  return { discount, couponId: coupon.id };
}

/**
 * Crée la commande (statut PENDING) à partir du panier — totaux recalculés
 * côté serveur, jamais depuis le client — puis crée un PaymentIntent Stripe et
 * renvoie le client_secret pour le Payment Element.
 */
export async function createCheckout(
  input: CheckoutInput
): Promise<CreateCheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Formulaire invalide." };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { success } = await enforceRateLimit("checkout", `checkout:${ip}`);
  if (!success) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const cart = await getCart();
  if (cart.lines.length === 0) {
    return { ok: false, error: "Votre panier est vide." };
  }

  // Reconstruit les lignes depuis la base (source de vérité prix + stock).
  const variantIds = cart.lines.map((l) => l.variantId);
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds }, isActive: true },
    include: { product: true },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const orderItems: {
    variantId: string;
    productName: string;
    variantInfo: string | null;
    sku: string;
    unitPrice: number;
    quantity: number;
  }[] = [];

  let subtotal = 0;
  for (const line of cart.lines) {
    const v = byId.get(line.variantId);
    if (!v || !v.product.isActive) {
      return { ok: false, error: `"${line.name}" n'est plus disponible.` };
    }
    const quantity = clamp(line.quantity, 1, v.inventory);
    if (quantity <= 0) {
      return { ok: false, error: `"${v.product.name}" est en rupture.` };
    }
    const unitPrice = resolveVariantPrice(v.price, v.product.basePrice);
    subtotal += unitPrice * quantity;
    orderItems.push({
      variantId: v.id,
      productName: v.product.name,
      variantInfo: [v.color, v.size].filter(Boolean).join(" · ") || null,
      sku: v.sku,
      unitPrice,
      quantity,
    });
  }

  const { discount, couponId, error } = await computeDiscount(
    parsed.data.couponCode || undefined,
    subtotal
  );
  if (error) return { ok: false, error };

  const total = Math.max(0, subtotal - discount + SHIPPING_FEE + TAX);
  const currency = cart.currency || "EUR";
  const d = parsed.data;

  // Création commande + lignes (snapshots).
  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      status: "PENDING",
      paymentStatus: "REQUIRES_PAYMENT",
      subtotal,
      discount,
      shippingFee: SHIPPING_FEE,
      tax: TAX,
      total,
      currency,
      couponId,
      email: d.email.toLowerCase(),
      shipName: d.fullName,
      shipLine1: d.line1,
      shipLine2: d.line2 || null,
      shipCity: d.city,
      shipPostalCode: d.postalCode,
      shipCountry: d.country.toUpperCase(),
      shipPhone: d.phone || null,
      items: { create: orderItems },
    },
  });

  // PaymentIntent Stripe (montant en plus petite unité, déjà en centimes).
  const paymentIntent = await stripe.paymentIntents.create({
    amount: total,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    receipt_email: d.email,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  if (!paymentIntent.client_secret) {
    return { ok: false, error: "Échec de l'initialisation du paiement." };
  }

  return {
    ok: true,
    clientSecret: paymentIntent.client_secret,
    orderNumber: order.orderNumber,
    total,
    currency,
  };
}

type ConfirmResult = {
  status: "succeeded" | "processing" | "failed" | "unknown";
  orderNumber?: string;
  total?: number;
  currency?: string;
};

/**
 * Réconcilie une commande avec l'état réel du PaymentIntent Stripe.
 * Idempotent : si la commande est déjà marquée payée, ne refait rien.
 * Utilisé par la page de succès ET (bientôt) par le webhook.
 */
export async function confirmOrder(
  paymentIntentId: string
): Promise<ConfirmResult> {
  if (!paymentIntentId) return { status: "unknown" };

  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { items: true },
  });
  if (!order) return { status: "unknown" };

  if (order.paymentStatus === "SUCCEEDED") {
    return {
      status: "succeeded",
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
    };
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (pi.status === "succeeded") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "SUCCEEDED", status: "PROCESSING" },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.variant
            .update({
              where: { id: item.variantId },
              data: { inventory: { decrement: item.quantity } },
            })
            .catch(() => undefined);
        }
      }

      await tx.transaction.create({
        data: {
          orderId: order.id,
          type: "CHARGE",
          amount: order.total,
          currency: order.currency,
          status: "SUCCEEDED",
          stripePaymentIntentId: pi.id,
          stripeChargeId:
            typeof pi.latest_charge === "string" ? pi.latest_charge : null,
        },
      });

      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { timesRedeemed: { increment: 1 } },
        });
      }
    });

    return {
      status: "succeeded",
      orderNumber: order.orderNumber,
      total: order.total,
      currency: order.currency,
    };
  }

  if (pi.status === "processing") {
    return { status: "processing", orderNumber: order.orderNumber };
  }

  return { status: "failed", orderNumber: order.orderNumber };
}
