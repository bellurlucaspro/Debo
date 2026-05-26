"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap";

const SESSION_KEY = "debo:preloaded";

/**
 * Révélation au chargement.
 * Écran Obsidian texturé → le logotype "DEBO" se révèle caractère par
 * caractère via un masque SplitText très fluide → l'écran se replie vers le
 * haut (effet rideau) pour dévoiler la page.
 *
 * Ne s'affiche qu'une fois par session ; respecte prefers-reduced-motion.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLHeadingElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const overlay = root.current;
      const heading = word.current;
      if (!overlay || !heading) return;

      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";

      // Saut du preloader : on rend immédiatement la page interactive.
      if (reduce || alreadyShown) {
        gsap.set(overlay, { autoAlpha: 0, display: "none" });
        setDone(true);
        return;
      }

      // Verrouille le scroll pendant l'intro.
      document.documentElement.style.overflow = "hidden";

      const split = new SplitText(heading, {
        type: "chars",
        mask: "chars",
      });

      const tl = gsap.timeline({
        defaults: { ease: "debo-soft" },
        onComplete: () => {
          split.revert();
          document.documentElement.style.overflow = "";
          sessionStorage.setItem(SESSION_KEY, "1");
          setDone(true);
        },
      });

      tl.set(heading, { autoAlpha: 1 })
        .from(split.chars, {
          yPercent: 115,
          duration: 1.1,
          stagger: 0.045,
        })
        .to(
          split.chars,
          { letterSpacing: "0.06em", duration: 0.9, ease: "debo-organic" },
          "-=0.4"
        )
        .to(heading, { autoAlpha: 0, duration: 0.5 }, "+=0.25")
        .to(
          overlay,
          {
            yPercent: -100,
            duration: 1.1,
            ease: "debo-organic",
          },
          "-=0.15"
        );

      return () => {
        split.revert();
        document.documentElement.style.overflow = "";
      };
    },
    { scope: root }
  );

  if (done) return null;

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
    >
      <h1
        ref={word}
        className="invisible relative z-[2] select-none font-serif text-[18vw] font-light leading-none text-foreground md:text-[12vw]"
      >
        DEBO
      </h1>
    </div>
  );
}
