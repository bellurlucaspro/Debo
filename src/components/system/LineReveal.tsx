"use client";

import { createElement, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Titre à révélation ligne par ligne (montée sous masque) au défilement.
 * Technique robuste sans SplitText : chaque ligne est un span dans un conteneur
 * `overflow-hidden`. État par défaut = visible (donc lisible même sans JS) ;
 * GSAP masque puis fait monter les lignes quand la section entre dans l'écran.
 */
export function LineReveal({
  lines,
  as = "h2",
  className,
  style,
  start = "top 82%",
}: {
  lines: React.ReactNode[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  style?: React.CSSProperties;
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const inner = el.querySelectorAll<HTMLElement>("[data-rl]");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.set(inner, { yPercent: 115 });
      gsap.to(inner, {
        yPercent: 0,
        duration: 1.15,
        ease: "debo-soft",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start, toggleActions: "play none none none" },
      });
    },
    { scope: ref }
  );

  return createElement(
    as,
    { ref, className, style },
    lines.map((line, i) => (
      <span key={i} className="block overflow-hidden">
        <span data-rl className={cn("block will-change-transform")}>
          {line}
        </span>
      </span>
    ))
  );
}
