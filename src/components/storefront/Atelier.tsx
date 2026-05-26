"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/system/Reveal";
import { LineReveal } from "@/components/system/LineReveal";
import { cn } from "@/lib/utils";
import { ATELIER, UNIVERSES } from "@/lib/images";

const POINTS = [
  {
    k: "01",
    t: "Sélection",
    d: "Perles de culture et pierres brutes choisies une à une pour leur potentiel de lumière.",
    img: UNIVERSES.pierres,
  },
  {
    k: "02",
    t: "Facettage",
    d: "Chaque angle ciselé à la main — jusqu'à 57 facettes — pour ouvrir des fenêtres dans la nacre.",
    img: ATELIER.wide,
  },
  {
    k: "03",
    t: "Certificat",
    d: "Chaque pièce est unique, signée et accompagnée de son certificat d'authenticité.",
    img: UNIVERSES.hauteJoaillerie,
  },
];

/**
 * Section "Savoir-faire" — bloc container Cobblestone (DA), angles droits.
 * L'image de gauche change au survol (ou focus) des étapes 01/02/03 : crossfade
 * doux entre les visuels associés. Titre à révélation ligne par ligne.
 */
export function Atelier() {
  const [active, setActive] = useState(1);

  return (
    <section className="bleed py-6 md:py-8">
      <div className="grid overflow-hidden bg-secondary text-secondary-foreground md:grid-cols-[1.05fr_1fr]">
        {/* Image — change au survol des étapes (crossfade) */}
        <div className="relative min-h-[52vh] overflow-hidden md:min-h-[88vh]">
          {POINTS.map((p, i) => (
            <Image
              key={p.k}
              src={p.img}
              alt={`Atelier — ${p.t}`}
              fill
              sizes="(max-width: 768px) 100vw, 52vw"
              priority={i === active}
              className={cn(
                "object-cover transition-all duration-[900ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
                i === active ? "scale-100 opacity-100" : "scale-105 opacity-0"
              )}
            />
          ))}
          {/* Pastille d'étape courante */}
          <span className="absolute bottom-5 left-5 z-10 font-serif text-sm tabular-nums text-background/80 mix-blend-difference">
            {POINTS[active]?.k} / 03
          </span>
        </div>

        {/* Contenu */}
        <div className="flex flex-col justify-center gap-8 p-8 md:p-14 lg:p-20">
          <div>
            <Reveal>
              <p className="kicker">Savoir-faire</p>
            </Reveal>
            <LineReveal
              as="h2"
              className="mt-5 font-serif font-light leading-[0.92]"
              style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.75rem)" }}
              lines={[
                "La main avant",
                <span key="2" className="italic text-primary">
                  la machine.
                </span>,
              ]}
            />
            <Reveal>
              <p className="mt-7 max-w-md leading-relaxed text-secondary-foreground/80">
                Lapidaire, Clarisse Debost taille perles et pierres à la main,
                une à une. Pas de série, pas de raccourci — seulement le temps
                qu'il faut pour qu'une matière brute devienne lumière.
              </p>
            </Reveal>
          </div>

          <ul className="border-t border-foreground/15">
            {POINTS.map((p, i) => (
              <li
                key={p.k}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                tabIndex={0}
                className={cn(
                  "flex cursor-default gap-6 border-b border-foreground/15 py-6 outline-none transition-all duration-500",
                  i === active ? "pl-2 opacity-100" : "opacity-55 hover:opacity-90"
                )}
              >
                <span
                  className={cn(
                    "font-serif text-2xl tabular-nums transition-colors duration-500",
                    i === active ? "text-primary" : "text-foreground/40"
                  )}
                >
                  {p.k}
                </span>
                <div>
                  <h3 className="font-serif text-xl md:text-2xl">{p.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-secondary-foreground/75">
                    {p.d}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Reveal>
            <Link
              href="/haute-joaillerie"
              className="link-underline gap-3 text-[11px] uppercase tracking-luxe text-foreground"
            >
              Découvrir la haute joaillerie
              <ArrowUpRight className="size-3.5" strokeWidth={1.4} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
