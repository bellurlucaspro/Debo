import Link from "next/link";
import type { Metadata } from "next";
import { Check, Clock, AlertCircle } from "lucide-react";

import { confirmOrder } from "@/server/actions/checkout";
import { ClearCartOnMount } from "@/components/checkout/ClearCartOnMount";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Commande confirmée",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  payment_intent?: string;
  order?: string;
  redirect_status?: string;
}>;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const paymentIntentId =
    typeof sp.payment_intent === "string" ? sp.payment_intent : "";

  let result: Awaited<ReturnType<typeof confirmOrder>> = { status: "unknown" };
  try {
    if (paymentIntentId) result = await confirmOrder(paymentIntentId);
  } catch {
    result = { status: "unknown" };
  }

  const orderNumber = result.orderNumber ?? sp.order ?? "";
  const succeeded = result.status === "succeeded";
  const processing = result.status === "processing";

  return (
    <section className="section-shell flex min-h-[70vh] flex-col items-center justify-center py-28 text-center">
      {succeeded && <ClearCartOnMount />}

      <div className="grid size-16 place-items-center rounded-full border border-border">
        {succeeded ? (
          <Check className="size-7" strokeWidth={1.4} />
        ) : processing ? (
          <Clock className="size-7" strokeWidth={1.4} />
        ) : (
          <AlertCircle className="size-7" strokeWidth={1.4} />
        )}
      </div>

      <h1 className="mt-8 font-serif text-4xl leading-tight md:text-5xl">
        {succeeded
          ? "Merci pour votre commande."
          : processing
            ? "Paiement en cours de validation"
            : "Statut de la commande"}
      </h1>

      {orderNumber && (
        <p className="mt-4 text-sm uppercase tracking-luxe text-muted-foreground">
          Commande {orderNumber}
        </p>
      )}

      <p className="mt-6 max-w-md text-muted-foreground">
        {succeeded ? (
          <>
            Votre paiement de{" "}
            <span className="text-foreground">
              {formatMoney(result.total ?? 0, result.currency ?? "EUR")}
            </span>{" "}
            a bien été reçu. Un e-mail de confirmation vous sera envoyé. Chaque
            pièce est façonnée à la main avec le plus grand soin.
          </>
        ) : processing ? (
          "Votre paiement est en cours de traitement par votre banque. Vous recevrez une confirmation sous peu."
        ) : (
          "Nous n'avons pas pu confirmer le statut de votre paiement ici. S'il a été débité, votre commande sera bien enregistrée. Contactez-nous au besoin."
        )}
      </p>

      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Button asChild size="lg">
          <Link href="/shop">Continuer mes découvertes</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/account/orders">Mes commandes</Link>
        </Button>
      </div>
    </section>
  );
}
