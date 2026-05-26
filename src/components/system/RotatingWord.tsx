"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Mot qui défile en boucle (champ lexical) avec un swap sous masque : le mot
 * courant sort vers le haut, le suivant entre par le bas. Le premier mot est
 * rendu en SSR (lisible sans JS) ; la rotation se fait par mutation directe du
 * DOM pour éviter tout souci d'hydratation. Coupé en prefers-reduced-motion.
 */
export function RotatingWord({
  words,
  interval = 2400,
  className,
  highlight = false,
}: {
  words: string[];
  interval?: number;
  className?: string;
  /** Bande de surlignage (DA) derrière le mot pour le faire ressortir. */
  highlight?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const idx = useRef(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || words.length < 2) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const id = window.setInterval(() => {
        gsap.to(el, {
          yPercent: -115,
          autoAlpha: 0,
          duration: 0.45,
          ease: "power2.in",
          onComplete: () => {
            idx.current = (idx.current + 1) % words.length;
            el.textContent = words[idx.current] ?? "";
            gsap.fromTo(
              el,
              { yPercent: 115, autoAlpha: 0 },
              { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: "debo-soft" }
            );
          },
        });
      }, interval);

      return () => window.clearInterval(id);
    },
    { scope: ref }
  );

  return (
    <span
      className={cn(
        "relative inline-flex overflow-hidden align-bottom",
        highlight && "px-2"
      )}
      style={
        highlight
          ? {
              backgroundImage:
                "linear-gradient(transparent 50%, hsl(var(--secondary)) 50%, hsl(var(--secondary)) 90%, transparent 90%)",
            }
          : undefined
      }
    >
      <span ref={ref} className={cn("inline-block will-change-transform", className)}>
        {words[0]}
      </span>
    </span>
  );
}
