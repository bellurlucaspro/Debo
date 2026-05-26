"use server";

import { cookies } from "next/headers";
import { randomUUID, createHmac } from "crypto";

import { prisma } from "@/lib/prisma";
import {
  redis,
  redisKeys,
  redisConfigured,
  GUEST_CART_TTL,
} from "@/lib/redis";
import { env } from "@/lib/env";
import { auth } from "@/server/auth/auth";
import { clamp, resolveVariantPrice } from "@/lib/utils";
import {
  addToCartSchema,
  updateCartItemSchema,
  type AddToCartInput,
  type UpdateCartItemInput,
} from "@/schemas/cart";
import { EMPTY_CART, type CartView } from "@/types/cart";

/**
 * Panier hybride :
 *  - Utilisateur connecté → table `Cart`/`CartItem` (persistance durable).
 *  - Visiteur → liste {variantId, quantity} en Redis, indexée par un cookie.
 *
 * Toute lecture ré-enrichit les lignes depuis la base : le prix, le stock et
 * le nom affichés sont TOUJOURS la source de vérité serveur, jamais le client.
 */

const CART_COOKIE = "debo_cart"; // identifiant de panier invité (mode Redis)
const CART_DATA_COOKIE = "debo_cart_data"; // données du panier signées (repli sans Redis)

type RawItem = { variantId: string; quantity: number };

/**
 * Signature HMAC du panier invité stocké en cookie (repli sans Redis).
 * Empêche la falsification du cookie ; le contenu est de toute façon
 * re-validé contre la base à chaque lecture (prix, stock, existence).
 */
function signCart(items: RawItem[]): string {
  const payload = Buffer.from(JSON.stringify(items)).toString("base64url");
  const sig = createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function unsignCart(value: string): RawItem[] {
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return [];
  const expected = createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  if (sig !== expected) return []; // signature invalide → on ignore
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    return Array.isArray(parsed) ? (parsed as RawItem[]) : [];
  } catch {
    return [];
  }
}

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Récupère (ou crée) l'identifiant de panier invité stocké en cookie. */
async function getGuestCartId(create: boolean): Promise<string | null> {
  const store = await cookies();
  let id = store.get(CART_COOKIE)?.value ?? null;
  if (!id && create) {
    id = randomUUID();
    store.set(CART_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_CART_TTL,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return id;
}

/** Lit le panier brut (sans enrichissement) selon l'état d'authentification. */
async function readRawCart(): Promise<RawItem[]> {
  const userId = await getUserId();
  if (userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    return (
      cart?.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
      })) ?? []
    );
  }
  // Visiteur : Redis si configuré, sinon repli cookie signé.
  if (redisConfigured) {
    const guestId = await getGuestCartId(false);
    if (!guestId) return [];
    try {
      const items = await redis.get<RawItem[]>(redisKeys.guestCart(guestId));
      return items ?? [];
    } catch {
      // Redis injoignable → on retombe sur le cookie ci-dessous.
    }
  }
  const store = await cookies();
  const raw = store.get(CART_DATA_COOKIE)?.value;
  return raw ? unsignCart(raw) : [];
}

/** Persiste le panier invité en Redis (TTL glissant). */
async function writeGuestCart(items: RawItem[]): Promise<void> {
  // Mode Redis si configuré.
  if (redisConfigured) {
    const guestId = await getGuestCartId(true);
    if (guestId) {
      try {
        if (items.length === 0) {
          await redis.del(redisKeys.guestCart(guestId));
        } else {
          await redis.set(redisKeys.guestCart(guestId), items, {
            ex: GUEST_CART_TTL,
          });
        }
        return;
      } catch {
        // Redis injoignable → repli cookie ci-dessous.
      }
    }
  }

  // Repli : cookie signé.
  const store = await cookies();
  if (items.length === 0) {
    store.delete(CART_DATA_COOKIE);
    return;
  }
  store.set(CART_DATA_COOKIE, signCart(items), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_TTL,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Vérifie qu'une variante est commandable et renvoie son contexte produit. */
async function loadOrderableVariant(variantId: string) {
  const variant = await prisma.variant.findFirst({
    where: { id: variantId, isActive: true },
    include: {
      product: {
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
  if (!variant || !variant.product.isActive) {
    throw new Error("Cet article n'est plus disponible.");
  }
  return variant;
}

/** Transforme un panier brut en vue enrichie + totaux. */
async function buildCartView(raw: RawItem[]): Promise<CartView> {
  if (raw.length === 0) return EMPTY_CART;

  const variants = await prisma.variant.findMany({
    where: { id: { in: raw.map((r) => r.variantId) }, isActive: true },
    include: {
      product: {
        include: { images: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = raw.flatMap((r) => {
    const v = byId.get(r.variantId);
    if (!v || !v.product.isActive) return [];
    const unitPrice = resolveVariantPrice(v.price, v.product.basePrice);
    const quantity = clamp(r.quantity, 1, Math.max(1, v.inventory));
    return [
      {
        variantId: v.id,
        productSlug: v.product.slug,
        name: v.product.name,
        image: v.product.images[0]?.url ?? null,
        color: v.color,
        size: v.size,
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
        inventory: v.inventory,
      },
    ];
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const currency = variants[0]?.product.currency ?? "EUR";

  return { lines, subtotal, count, currency };
}

/** Lecture publique du panier courant. */
export async function getCart(): Promise<CartView> {
  return buildCartView(await readRawCart());
}

/** Ajoute (ou incrémente) une variante au panier. */
export async function addToCart(input: AddToCartInput): Promise<CartView> {
  const { variantId, quantity } = addToCartSchema.parse(input);
  const variant = await loadOrderableVariant(variantId);

  if (variant.inventory <= 0) {
    throw new Error("Article en rupture de stock.");
  }

  const userId = await getUserId();

  if (userId) {
    const cart = await prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const nextQty = clamp(
      (existing?.quantity ?? 0) + quantity,
      1,
      variant.inventory
    );
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity: nextQty },
      create: { cartId: cart.id, variantId, quantity: nextQty },
    });
  } else {
    const items = await readRawCart();
    const existing = items.find((i) => i.variantId === variantId);
    if (existing) {
      existing.quantity = clamp(
        existing.quantity + quantity,
        1,
        variant.inventory
      );
    } else {
      items.push({
        variantId,
        quantity: clamp(quantity, 1, variant.inventory),
      });
    }
    await writeGuestCart(items);
  }

  return buildCartView(await readRawCart());
}

/** Met à jour la quantité d'une ligne (0 = suppression). */
export async function updateCartItem(
  input: UpdateCartItemInput
): Promise<CartView> {
  const { variantId, quantity } = updateCartItemSchema.parse(input);

  if (quantity === 0) {
    return removeFromCart(variantId);
  }

  const variant = await loadOrderableVariant(variantId);
  const boundedQty = clamp(quantity, 1, Math.max(1, variant.inventory));
  const userId = await getUserId();

  if (userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        update: { quantity: boundedQty },
        create: { cartId: cart.id, variantId, quantity: boundedQty },
      });
    }
  } else {
    const items = await readRawCart();
    const existing = items.find((i) => i.variantId === variantId);
    if (existing) {
      existing.quantity = boundedQty;
      await writeGuestCart(items);
    }
  }

  return buildCartView(await readRawCart());
}

/** Retire une ligne du panier. */
export async function removeFromCart(variantId: string): Promise<CartView> {
  const userId = await getUserId();

  if (userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem
        .delete({
          where: { cartId_variantId: { cartId: cart.id, variantId } },
        })
        .catch(() => undefined); // ignore si déjà absent
    }
  } else {
    const items = (await readRawCart()).filter(
      (i) => i.variantId !== variantId
    );
    await writeGuestCart(items);
  }

  return buildCartView(await readRawCart());
}

/** Vide entièrement le panier. */
export async function clearCart(): Promise<CartView> {
  const userId = await getUserId();
  if (userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  } else {
    await writeGuestCart([]);
  }
  return EMPTY_CART;
}
