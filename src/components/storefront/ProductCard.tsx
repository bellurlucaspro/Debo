"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";

import { gsap, useGSAP } from "@/lib/gsap";
import { cn, formatMoney, resolveVariantPrice } from "@/lib/utils";

export type ProductCardData = {
  name: string;
  slug: string;
  basePrice: number;
  currency: string;
  images: { url: string; alt: string | null }[];
  variants: { price: number | null }[];
};

/**
 * Carte création — micro-interaction "galerie" : l'image se déplace en
 * parallaxe inverse du curseur et zoome doucement au survol. Le cadre est une
 * surface à halo (éclairé par le CursorLight global).
 */
export function ProductCard({
  product,
  className,
}: {
  product: ProductCardData;
  className?: string;
}) {
  const frame = useRef<HTMLAnchorElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const moveX = useRef<((v: number) => void) | null>(null);
  const moveY = useRef<((v: number) => void) | null>(null);

  useGSAP(
    () => {
      if (!img.current) return;
      moveX.current = gsap.quickTo(img.current, "xPercent", {
        duration: 0.6,
        ease: "power3.out",
      });
      moveY.current = gsap.quickTo(img.current, "yPercent", {
        duration: 0.6,
        ease: "power3.out",
      });
    },
    { scope: frame }
  );

  function onMove(e: React.PointerEvent) {
    const el = frame.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    moveX.current?.(nx * -6);
    moveY.current?.(ny * -6);
  }

  function onEnter() {
    if (img.current) gsap.to(img.current, { scale: 1.08, duration: 0.7, ease: "debo-soft" });
  }

  function onLeave() {
    if (img.current) {
      gsap.to(img.current, { scale: 1, duration: 0.7, ease: "debo-soft" });
      moveX.current?.(0);
      moveY.current?.(0);
    }
  }

  // Prix le plus bas (variantes ou prix de base).
  const minPrice = product.variants.length
    ? Math.min(
        ...product.variants.map((v) =>
          resolveVariantPrice(v.price, product.basePrice)
        )
      )
    : product.basePrice;

  const cover = product.images[0];

  return (
    <Link
      ref={frame}
      href={`/shop/${product.slug}`}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      className={cn("group block", className)}
    >
      <div className="halo-surface lift relative aspect-[4/5] overflow-hidden rounded-sm border border-border bg-secondary">
        <div ref={img} className="absolute inset-0 will-change-transform">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt ?? product.name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          ) : null}
        </div>
        {/* léger assombrissement bas pour lisibilité */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-lg leading-tight">{product.name}</h3>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {formatMoney(minPrice, product.currency)}
        </span>
      </div>
    </Link>
  );
}
