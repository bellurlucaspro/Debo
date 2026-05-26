"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { gsap, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import { GEMS } from "@/lib/images";

/**
 * "Gemmes à découvrir" — section sombre, immersive.
 * Le survol (ou focus) d'un nom fait apparaître la gemme correspondante au
 * centre avec un fondu/zoom GSAP. Titre display géant à gauche.
 */
export function GemsToDiscover() {
  const root = useRef<HTMLDivElement>(null);
  const imageWrap = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      if (!imageWrap.current) return;
      gsap.fromTo(
        imageWrap.current,
        { autoAlpha: 0.25, scale: 1.04, yPercent: 2 },
        {
          autoAlpha: 1,
          scale: 1,
          yPercent: 0,
          duration: 0.7,
          ease: "debo-soft",
          overwrite: "auto",
        }
      );
    },
    { scope: root, dependencies: [active] }
  );

  const current = GEMS[active]!;

  return (
    <section
      ref={root}
      className="section-shell py-24 md:py-32"
    >
      <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr_auto]">
        {/* Titre + lien */}
        <div className="order-2 md:order-1">
          <p className="kicker mb-6">Le nuancier</p>
          <h2
            className="font-serif font-light uppercase leading-[0.85] text-foreground"
            style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
          >
            Gemmes
            <br />à découvrir
          </h2>
          <Link
            href="/shop"
            className="link-underline mt-10 pb-1 text-[11px] uppercase tracking-luxe text-foreground"
          >
            Toutes les créations
          </Link>
        </div>

        {/* Gemme centrale */}
        <div className="order-1 flex justify-center md:order-2">
          <div
            ref={imageWrap}
            className="relative aspect-[3/4] w-full max-w-[360px] overflow-hidden rounded-sm border border-border bg-secondary will-change-transform"
          >
            <Image
              src={current.img}
              alt={current.name}
              fill
              sizes="360px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Liste des gemmes */}
        <ul className="order-3 flex flex-col gap-2 md:order-3">
          {GEMS.map((gem, i) => (
            <li key={gem.name} className="flex items-baseline gap-3">
              <span
                className={cn(
                  "font-serif text-xs tabular-nums transition-opacity duration-300",
                  i === active ? "text-primary opacity-100" : "opacity-0"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <button
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className={cn(
                  "font-serif text-2xl transition-all duration-300 md:text-3xl",
                  i === active
                    ? "text-foreground"
                    : "text-foreground/30 hover:text-foreground/60"
                )}
              >
                {gem.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
