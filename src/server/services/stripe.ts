import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Client Stripe (singleton, runtime Node uniquement).
 * On laisse la version d'API par défaut épinglée par le SDK pour éviter toute
 * dérive de typage. Mise en cache sur globalThis en dev (hot-reload).
 */
const globalForStripe = globalThis as unknown as { stripe?: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(env.STRIPE_SECRET_KEY, {
    typescript: true,
    appInfo: { name: "DEBO", version: "1.0.0" },
  });

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe;
}
