"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

import { createCheckout } from "@/server/actions/checkout";
import { checkoutSchema } from "@/schemas/checkout";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

const FIELD =
  "w-full border-b border-border bg-transparent py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground";

type Phase =
  | { step: "address" }
  | {
      step: "payment";
      clientSecret: string;
      orderNumber: string;
      total: number;
      currency: string;
    };

export function CheckoutForm() {
  const [phase, setPhase] = useState<Phase>({ step: "address" });
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "FR",
    phone: "",
    couponCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Formulaire invalide.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCheckout(parsed.data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPhase({
        step: "payment",
        clientSecret: res.clientSecret,
        orderNumber: res.orderNumber,
        total: res.total,
        currency: res.currency,
      });
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase.step === "payment") {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: phase.clientSecret,
          appearance: {
            theme: "flat",
            variables: {
              colorPrimary: "#810000",
              colorText: "#1E2022",
              fontFamily: "Inter, system-ui, sans-serif",
              borderRadius: "4px",
              spacingUnit: "4px",
            },
          },
        }}
      >
        <PaymentSection
          orderNumber={phase.orderNumber}
          total={phase.total}
          currency={phase.currency}
        />
      </Elements>
    );
  }

  return (
    <form onSubmit={onAddressSubmit} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-5">
        <legend className="eyebrow mb-3">Contact</legend>
        <input
          type="email"
          required
          placeholder="Adresse e-mail"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          className={FIELD}
        />
        <input
          required
          placeholder="Nom complet"
          autoComplete="name"
          value={form.fullName}
          onChange={set("fullName")}
          className={FIELD}
        />
        <input
          placeholder="Téléphone (optionnel)"
          autoComplete="tel"
          value={form.phone}
          onChange={set("phone")}
          className={FIELD}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="eyebrow mb-3">Livraison</legend>
        <input
          required
          placeholder="Adresse"
          autoComplete="address-line1"
          value={form.line1}
          onChange={set("line1")}
          className={FIELD}
        />
        <input
          placeholder="Complément (optionnel)"
          autoComplete="address-line2"
          value={form.line2}
          onChange={set("line2")}
          className={FIELD}
        />
        <div className="grid grid-cols-2 gap-5">
          <input
            required
            placeholder="Code postal"
            autoComplete="postal-code"
            value={form.postalCode}
            onChange={set("postalCode")}
            className={FIELD}
          />
          <input
            required
            placeholder="Ville"
            autoComplete="address-level2"
            value={form.city}
            onChange={set("city")}
            className={FIELD}
          />
        </div>
        <input
          required
          placeholder="Pays (code 2 lettres, ex. FR)"
          autoComplete="country"
          maxLength={2}
          value={form.country}
          onChange={(e) =>
            setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))
          }
          className={FIELD}
        />
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Code promo</legend>
        <input
          placeholder="BIENVENUE10 (optionnel)"
          value={form.couponCode}
          onChange={(e) =>
            setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))
          }
          className={FIELD}
        />
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Préparation…" : "Continuer vers le paiement"}
      </Button>
    </form>
  );
}

/** Étape paiement : Payment Element + confirmation. */
function PaymentSection({
  orderNumber,
  total,
  currency,
}: {
  orderNumber: string;
  total: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order=${orderNumber}`,
      },
    });

    // Si on arrive ici, c'est qu'il y a eu une erreur immédiate
    // (sinon Stripe redirige vers return_url).
    if (submitError) {
      setError(submitError.message ?? "Le paiement a échoué.");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={onPay} className="flex flex-col gap-6">
      <p className="eyebrow">Paiement sécurisé · Commande {orderNumber}</p>
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={!stripe || paying}>
        {paying ? "Paiement…" : `Payer ${formatMoney(total, currency)}`}
      </Button>
      <p className="text-xs text-muted-foreground">
        Vos informations de paiement sont chiffrées et traitées par Stripe.
      </p>
    </form>
  );
}
