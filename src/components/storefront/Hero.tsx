"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { gsap, useGSAP } from "@/lib/gsap";
import { Button } from "@/components/ui/button";
import { RotatingWord } from "@/components/system/RotatingWord";
import { GemShowcase } from "@/components/storefront/GemShowcase";

// Champ lexical du lapidaire — le dernier mot du titre défile.
const LEX = ["la lumière", "la matière", "l'éclat", "le reflet", "la rareté", "la nacre"];

const SESSION_KEY = "debo:preloaded";

const CERTS = ["GIA", "Gübelin", "GRS", "GLA"];

/**
 * Hero — composition éditoriale asymétrique, ultra-graphique.
 * Titre display calé à gauche, gemme 3D rejetée à droite (graphique, rognée),
 * méta dans les angles, filets structurants (poster). Rien de centré.
 * Entrée orchestrée + parallaxe gemme. Tout en transforms/opacity.
 */
export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const ctas = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const gem = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const lines = headline.current?.querySelectorAll<HTMLElement>("[data-hl]");

      if (reduce) {
        gsap.set([top.current, sub.current, ctas.current, bottom.current, gem.current], {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
        });
        return;
      }

      const preloaded = sessionStorage.getItem(SESSION_KEY) === "1";
      const delay = preloaded ? 0.2 : 2.2;

      if (lines) gsap.set(lines, { yPercent: 115 });
      gsap.set(top.current, { autoAlpha: 0, y: -14 });
      gsap.set([sub.current, ctas.current], { autoAlpha: 0, y: 18 });
      gsap.set(bottom.current, { autoAlpha: 0, y: 14 });
      gsap.set(gem.current, { autoAlpha: 0, scale: 0.62, x: 60 });

      gsap
        .timeline({ delay })
        .to(top.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: "debo-soft" })
        .to(
          lines ?? [],
          { yPercent: 0, duration: 1.2, ease: "debo-soft", stagger: 0.13 },
          0.05
        )
        .to(gem.current, { autoAlpha: 1, scale: 1, x: 0, duration: 1.5, ease: "debo-organic" }, 0.2)
        .to(sub.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: "debo-soft" }, 0.6)
        .to(ctas.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: "debo-soft" }, 0.72)
        .to(bottom.current, { autoAlpha: 1, y: 0, duration: 0.8, ease: "debo-soft" }, 0.78);

      gsap.to(gem.current, {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="bleed pb-6 pt-[5.5rem] md:pt-24">
      <div className="relative flex min-h-[88vh] flex-col overflow-hidden border border-border bg-gradient-to-br from-card via-background to-background px-6 py-8 md:min-h-[90vh] md:px-12 md:py-10">
        {/* Pierres taillées — défilé zoom, pince collée au bord droit.
            z-20 + pointer-events-none : passe au-dessus du contenu sans le
            bloquer ; seules les mini-cartes réactivent les clics. */}
        <div
          ref={gem}
          className="pointer-events-none absolute right-0 top-1/2 z-20 h-[46vh] w-[78%] -translate-y-1/2 will-change-transform sm:w-[60%] md:h-[78vh] md:w-[52%]"
        >
          <GemShowcase />
        </div>

        {/* Ligne méta haute */}
        <div
          ref={top}
          className="relative z-10 flex items-center justify-between gap-4 border-b border-border/70 pb-5"
        >
          <p className="kicker">Perles facettées · Pierres · Haute joaillerie</p>
          <span className="hidden text-[11px] uppercase tracking-luxe text-muted-foreground sm:block">
            Atelier · Puy-de-Dôme
          </span>
        </div>

        {/* Bloc principal — calé à gauche */}
        <div className="relative z-10 flex flex-1 flex-col justify-center py-12">
          <h1
            ref={headline}
            className="max-w-[16ch] font-serif font-light uppercase leading-[0.86] tracking-[-0.01em] text-foreground"
            style={{ fontSize: "clamp(3rem, 9vw, 8.5rem)" }}
          >
            <span className="block overflow-hidden">
              <span data-hl className="block will-change-transform">
                L'art de
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-hl className="block will-change-transform">
                tailler
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-hl className="block will-change-transform">
                <RotatingWord
                  words={LEX}
                  highlight
                  className="font-normal italic text-primary"
                />
                <span className="ml-2 inline-block size-3 align-baseline bg-primary md:size-5" />
              </span>
            </span>
          </h1>

          <p
            ref={sub}
            className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            Perles de culture facettées et pierres précieuses, taillées à la main
            par Clarisse Debost.{" "}
            <span className="font-medium text-foreground">Pièces uniques, certifiées.</span>
          </p>

          <div ref={ctas} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/contact">
                Prendre rendez-vous
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/shop">
                Découvrir les créations
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </Link>
            </Button>
          </div>
        </div>

        {/* Ligne méta basse — certifications */}
        <div
          ref={bottom}
          className="relative z-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-border/70 pt-5"
        >
          <span className="text-[11px] uppercase tracking-luxe text-foreground/40">
            Certifié
          </span>
          {CERTS.map((c) => (
            <span
              key={c}
              className="text-[11px] uppercase tracking-luxe text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
