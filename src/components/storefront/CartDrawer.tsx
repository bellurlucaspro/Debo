"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { gsap, useGSAP } from "@/lib/gsap";
import { useCart } from "@/components/providers/CartProvider";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import type { CartLine } from "@/types/cart";

/**
 * Tiroir panier — concept "écrin de lumière".
 * Ouverture : voile sombre en fondu + panneau qui glisse avec un rebond
 * maîtrisé (CustomEase `debo-bounce`) + lignes révélées en cascade.
 * Totaux mis à jour en temps réel via le CartProvider (React Query).
 */
export function CartDrawer() {
  const { cart, isOpen, close, isMutating } = useCart();

  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  // Construit la timeline d'ouverture une seule fois.
  useGSAP(
    () => {
      gsap.set(overlay.current, { autoAlpha: 0 });
      gsap.set(panel.current, { xPercent: 100 });

      timeline.current = gsap
        .timeline({ paused: true })
        .to(overlay.current, { autoAlpha: 1, duration: 0.45, ease: "power2.out" })
        .to(
          panel.current,
          { xPercent: 0, duration: 0.8, ease: "debo-bounce" },
          0
        );
    },
    { scope: root }
  );

  // Joue / inverse la timeline et gère le verrouillage du scroll.
  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    if (isOpen) {
      tl.play();
      document.body.style.overflow = "hidden";
      // Révèle les lignes en cascade à chaque ouverture (état courant du panier).
      const rows = panel.current?.querySelectorAll(".cart-line");
      if (rows && rows.length) {
        gsap.fromTo(
          rows,
          { x: 28, autoAlpha: 0 },
          {
            x: 0,
            autoAlpha: 1,
            duration: 0.55,
            ease: "debo-soft",
            stagger: 0.07,
            delay: 0.2,
          }
        );
      }
    } else {
      tl.reverse();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Fermeture au clavier (Échap).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const empty = cart.lines.length === 0;

  return (
    <div
      ref={root}
      aria-hidden={!isOpen}
      className={cn(
        "fixed inset-0 z-[80]",
        !isOpen && "pointer-events-none"
      )}
    >
      {/* Voile sombre */}
      <div
        ref={overlay}
        onClick={close}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
      />

      {/* Panneau */}
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Panier"
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col bg-background shadow-[-20px_0_60px_-20px_hsl(var(--foreground)/0.35)]"
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="size-5" strokeWidth={1.4} />
            <h2 className="font-serif text-xl">
              Votre panier
              <span className="ml-2 align-middle text-sm text-muted-foreground">
                ({cart.count})
              </span>
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Fermer le panier"
            className="grid size-9 place-items-center rounded-sm transition-colors hover:bg-foreground/5"
          >
            <X className="size-5" strokeWidth={1.4} />
          </button>
        </header>

        {/* Lignes */}
        <div className="flex-1 overflow-y-auto px-6">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ShoppingBag
                className="size-10 text-muted-foreground"
                strokeWidth={1}
              />
              <p className="text-muted-foreground">
                Votre panier est vide pour l'instant.
              </p>
              <Button variant="outline" size="sm" asChild onClick={close}>
                <Link href="/shop">Découvrir la collection</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.lines.map((line) => (
                <CartLineRow key={line.variantId} line={line} />
              ))}
            </ul>
          )}
        </div>

        {/* Pied : totaux temps réel + CTA */}
        {!empty && (
          <footer className="border-t border-border px-6 py-6">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Sous-total</span>
              <span className="font-serif text-2xl tabular-nums">
                {formatMoney(cart.subtotal, cart.currency)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Livraison et taxes calculées au paiement.
            </p>
            <Button
              size="lg"
              className="mt-5 w-full"
              asChild
              disabled={isMutating}
            >
              <Link href="/checkout" onClick={close}>
                Passer commande
              </Link>
            </Button>
          </footer>
        )}
      </aside>
    </div>
  );
}

/** Ligne panier : visuel, infos variante, sélecteur de quantité, suppression. */
function CartLineRow({ line }: { line: CartLine }) {
  const { setQuantity, removeItem, pendingVariantId } = useCart();
  const pending = pendingVariantId === line.variantId;
  const variantLabel = [line.color, line.size].filter(Boolean).join(" · ");

  return (
    <li
      className={cn(
        "cart-line flex gap-4 py-5 transition-opacity",
        pending && "opacity-50"
      )}
    >
      <Link
        href={`/shop/${line.productSlug}`}
        className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-sm bg-secondary"
      >
        {line.image ? (
          <Image
            src={line.image}
            alt={line.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link
            href={`/shop/${line.productSlug}`}
            className="font-serif text-base leading-tight hover:underline"
          >
            {line.name}
          </Link>
          <button
            onClick={() => removeItem(line.variantId)}
            disabled={pending}
            aria-label="Retirer l'article"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" strokeWidth={1.4} />
          </button>
        </div>

        {variantLabel && (
          <span className="mt-0.5 text-xs uppercase tracking-luxe text-muted-foreground">
            {variantLabel}
          </span>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          {/* Stepper quantité */}
          <div className="flex items-center rounded-sm border border-border">
            <button
              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
              disabled={pending}
              aria-label="Diminuer la quantité"
              className="grid size-8 place-items-center transition-colors hover:bg-foreground/5 disabled:opacity-40"
            >
              <Minus className="size-3.5" strokeWidth={1.6} />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">
              {line.quantity}
            </span>
            <button
              onClick={() => setQuantity(line.variantId, line.quantity + 1)}
              disabled={pending || line.quantity >= line.inventory}
              aria-label="Augmenter la quantité"
              className="grid size-8 place-items-center transition-colors hover:bg-foreground/5 disabled:opacity-40"
            >
              <Plus className="size-3.5" strokeWidth={1.6} />
            </button>
          </div>

          <span className="text-sm tabular-nums">
            {formatMoney(line.lineTotal, "EUR")}
          </span>
        </div>
      </div>
    </li>
  );
}
