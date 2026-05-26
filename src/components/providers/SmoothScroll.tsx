"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Smooth scroll inertiel (Lenis) synchronisé avec GSAP ScrollTrigger — c'est le
 * combo utilisé par les sites d'inspiration (LV Collectibles, GQ Lab).
 *
 * - Le RAF de Lenis est piloté par le ticker GSAP → un seul boucle de rendu,
 *   pas de désynchronisation entre le défilement et les animations pinned.
 * - Désactivé en `prefers-reduced-motion` (accessibilité) : on garde le scroll
 *   natif.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      // easing exponentiel doux ("galerie d'art")
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);

    // Expose l'instance pour le défilement programmatique (ancres, "remonter").
    (window as Window & { lenis?: Lenis }).lenis = lenis;

    return () => {
      gsap.ticker.remove(onRaf);
      lenis.destroy();
      delete (window as Window & { lenis?: Lenis }).lenis;
    };
  }, []);

  return <>{children}</>;
}
