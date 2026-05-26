"use client";

import { useMemo, useRef, useState } from "react";
import { Minus, Plus, Check } from "lucide-react";

import { gsap, useGSAP } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/CartProvider";
import { cn, formatMoney, resolveVariantPrice } from "@/lib/utils";
import { colorHex } from "@/lib/palette";

type Variant = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  price: number | null;
  inventory: number;
  isActive: boolean;
};

type PurchaseProduct = {
  name: string;
  basePrice: number;
  currency: string;
  category: { name: string; slug: string } | null;
  variants: Variant[];
};

function uniqueTruthy<T>(arr: (T | null)[]): T[] {
  return Array.from(new Set(arr.filter((v): v is T => v != null)));
}

/**
 * Bloc d'achat PDP : sélection couleur/taille, prix dynamique, quantité et
 * ajout au panier (qui ouvre le tiroir). Les sélecteurs apparaissent en
 * cascade (GSAP).
 */
export function ProductPurchase({ product }: { product: PurchaseProduct }) {
  const { addItem, pendingVariantId } = useCart();
  const root = useRef<HTMLDivElement>(null);

  const active = product.variants.filter((v) => v.isActive);
  const colorOptions = uniqueTruthy(active.map((v) => v.color));
  const hasColors = colorOptions.length > 0;

  const [color, setColor] = useState<string | null>(
    hasColors ? colorOptions[0]! : null
  );

  const sizeOptions = useMemo(
    () =>
      uniqueTruthy(
        active
          .filter((v) => (hasColors ? v.color === color : true))
          .map((v) => v.size)
      ),
    [active, color, hasColors]
  );
  const hasSizes = sizeOptions.length > 0;

  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Variante effectivement sélectionnée.
  const currentVariant = useMemo(() => {
    return active.find(
      (v) =>
        (!hasColors || v.color === color) &&
        (!hasSizes || v.size === size)
    );
  }, [active, color, size, hasColors, hasSizes]);

  const needsSize = hasSizes && !size;
  const unitPrice = currentVariant
    ? resolveVariantPrice(currentVariant.price, product.basePrice)
    : Math.min(
        ...active.map((v) => resolveVariantPrice(v.price, product.basePrice))
      );

  const outOfStock = !!currentVariant && currentVariant.inventory <= 0;
  const maxQty = currentVariant?.inventory ?? 1;
  const pending = currentVariant
    ? pendingVariantId === currentVariant.id
    : false;

  useGSAP(
    () => {
      gsap.from(".purchase-stagger", {
        autoAlpha: 0,
        y: 18,
        duration: 0.8,
        ease: "debo-soft",
        stagger: 0.08,
      });
    },
    { scope: root }
  );

  async function handleAdd() {
    if (!currentVariant || outOfStock || needsSize) return;
    await addItem(currentVariant.id, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div ref={root} className="flex flex-col">
      {product.category && (
        <p className="purchase-stagger eyebrow">{product.category.name}</p>
      )}

      <h1 className="purchase-stagger mt-4 font-serif text-4xl leading-tight md:text-5xl">
        {product.name}
      </h1>

      <p className="purchase-stagger mt-5 font-serif text-2xl tabular-nums">
        {needsSize || !currentVariant ? "À partir de " : ""}
        {formatMoney(unitPrice, product.currency)}
      </p>

      {/* Teintes */}
      {hasColors && (
        <div className="purchase-stagger mt-9">
          <p className="text-xs uppercase tracking-luxe text-muted-foreground">
            Teinte — <span className="text-foreground">{color}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setSize(null);
                }}
                aria-label={c}
                title={c}
                className={cn(
                  "relative size-9 rounded-full border transition-transform hover:scale-110",
                  color === c
                    ? "border-foreground ring-1 ring-foreground ring-offset-2 ring-offset-background"
                    : "border-border"
                )}
                style={{ backgroundColor: colorHex(c) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tailles */}
      {hasSizes && (
        <div className="purchase-stagger mt-7">
          <p className="text-xs uppercase tracking-luxe text-muted-foreground">
            Dimension
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sizeOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={cn(
                  "min-w-12 rounded-sm border px-4 py-2 text-sm transition-colors",
                  size === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantité + ajout */}
      <div className="purchase-stagger mt-9 flex items-center gap-4">
        <div className="flex items-center rounded-sm border border-border">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Diminuer"
            className="grid size-11 place-items-center transition-colors hover:bg-foreground/5 disabled:opacity-40"
          >
            <Minus className="size-4" strokeWidth={1.5} />
          </button>
          <span className="w-10 text-center tabular-nums">{qty}</span>
          <button
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            aria-label="Augmenter"
            className="grid size-11 place-items-center transition-colors hover:bg-foreground/5 disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1"
          onClick={handleAdd}
          disabled={pending || outOfStock || needsSize}
        >
          {justAdded ? (
            <>
              <Check className="size-4" /> Ajouté
            </>
          ) : outOfStock ? (
            "Épuisé"
          ) : needsSize ? (
            "Choisir une dimension"
          ) : pending ? (
            "Ajout…"
          ) : (
            "Ajouter au panier"
          )}
        </Button>
      </div>

      {currentVariant && !outOfStock && currentVariant.inventory <= 5 && (
        <p className="purchase-stagger mt-4 text-xs text-muted-foreground">
          Plus que {currentVariant.inventory} en stock — pièce façonnée à la
          main.
        </p>
      )}
    </div>
  );
}
