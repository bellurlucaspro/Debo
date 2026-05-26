"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * "Digital Lighting" — un halo lumineux subtil qui suit le curseur pour créer
 * l'illusion d'une source de lumière mobile (concept "All Lighting & Shadow").
 *
 * - Désactivé sur les pointeurs grossiers (tactile) et en reduced-motion.
 * - `mix-blend-mode: soft-light` : éclaircit les surfaces claires, révèle les
 *   sombres, sans jamais masquer le contenu (pointer-events: none).
 * - `gsap.quickTo` : suivi ultra-fluide à faible coût CPU.
 */
export function CursorLight() {
  const halo = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = halo.current;
      if (!el) return;

      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (!fine.matches || reduce.matches) return;

      gsap.set(el, { xPercent: -50, yPercent: -50 });

      const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3.out" });

      const onMove = (e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
        gsap.to(el, { opacity: 1, duration: 0.4, overwrite: "auto" });

        // Alimente aussi les surfaces .halo-surface survolées.
        const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
          ".halo-surface"
        );
        if (target) {
          const rect = target.getBoundingClientRect();
          target.style.setProperty("--mx", `${e.clientX - rect.left}px`);
          target.style.setProperty("--my", `${e.clientY - rect.top}px`);
        }
      };

      const onLeave = () =>
        gsap.to(el, { opacity: 0, duration: 0.5, overwrite: "auto" });

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);

      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: halo }
  );

  return (
    <div
      ref={halo}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[480px] w-[480px] rounded-full opacity-0 will-change-transform"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--halo) / 0.22), transparent 65%)",
        mixBlendMode: "soft-light",
      }}
    />
  );
}
