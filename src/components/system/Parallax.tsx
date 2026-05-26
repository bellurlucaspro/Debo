"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Parallaxe au défilement — l'élément dérive verticalement (transform only,
 * compositor-friendly). À placer dans un conteneur `overflow-hidden` ; le
 * contenu est légèrement sur-dimensionné pour ne jamais révéler de bord.
 * Coupé en prefers-reduced-motion.
 */
export function Parallax({
  children,
  className,
  amount = 14,
}: {
  children: React.ReactNode;
  className?: string;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        el,
        { yPercent: -amount },
        {
          yPercent: amount,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0 will-change-transform", className)}
      style={{ height: "130%", top: "-15%" }}
    >
      {children}
    </div>
  );
}
