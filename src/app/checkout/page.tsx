import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";

import { getCart } from "@/server/actions/cart";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Paiement",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) {
    redirect("/shop");
  }

  return (
    <section className="section-shell pb-28 pt-28 md:pt-36">
      <p className="kicker">Finaliser</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
        Paiement
      </h1>

      <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_minmax(320px,420px)]">
        {/* Formulaire */}
        <div className="order-2 lg:order-1">
          <CheckoutForm />
        </div>

        {/* Récapitulatif */}
        <aside className="order-1 h-fit rounded-sm border border-border bg-card p-7 lg:order-2 lg:sticky lg:top-28">
          <p className="kicker">Votre commande</p>
          <ul className="mt-6 divide-y divide-border">
            {cart.lines.map((line) => (
              <li key={line.variantId} className="flex gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-secondary">
                  {line.image && (
                    <Image
                      src={line.image}
                      alt={line.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-foreground text-[10px] text-background">
                    {line.quantity}
                  </span>
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="font-serif text-sm leading-tight">
                    {line.name}
                  </span>
                  {(line.color || line.size) && (
                    <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                      {[line.color, line.size].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <span className="text-sm tabular-nums">
                  {formatMoney(line.lineTotal, cart.currency)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 border-t border-border pt-6 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Sous-total</span>
              <span className="tabular-nums">
                {formatMoney(cart.subtotal, cart.currency)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Livraison</span>
              <span>Offerte</span>
            </div>
            <div className="flex items-baseline justify-between pt-2 font-serif text-xl">
              <span>Total</span>
              <span className="tabular-nums">
                {formatMoney(cart.subtotal, cart.currency)}
              </span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Une éventuelle remise est appliquée à l'étape suivante.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
