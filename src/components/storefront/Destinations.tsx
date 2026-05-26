import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/system/Reveal";
import { cn } from "@/lib/utils";
import { UNIVERSES, ATELIER } from "@/lib/images";

type Destination = {
  k: string;
  title: string;
  text: string;
  href: string;
  tone: string; // couleur de bloc (palette DA, mode-aware)
  overlay: string; // dégradé teinté pour garder le texte lisible sur l'image
  img: string;
};

const DESTINATIONS: Destination[] = [
  {
    k: "01",
    title: "La boutique",
    text: "Pièces disponibles, prêtes à être portées — perles facettées & pierres taillées.",
    href: "/shop",
    tone: "bg-foreground text-background",
    overlay: "from-foreground via-foreground/80 to-foreground/25",
    img: UNIVERSES.perles,
  },
  {
    k: "02",
    title: "Sur-mesure",
    text: "Composez votre pièce : diagramme, facettage, dimensions, teinte, monture.",
    href: "/sur-mesure",
    tone: "bg-secondary text-secondary-foreground",
    overlay: "from-secondary via-secondary/80 to-secondary/25",
    img: ATELIER.bench,
  },
  {
    k: "03",
    title: "Haute joaillerie",
    text: "Une création unique née de vos inspirations, dessinée et taillée à la main.",
    href: "/haute-joaillerie",
    tone: "bg-primary text-primary-foreground",
    overlay: "from-primary via-primary/80 to-primary/25",
    img: UNIVERSES.hauteJoaillerie,
  },
  {
    k: "04",
    title: "Prendre rendez-vous",
    text: "Un seul interlocuteur. Conseil, devis gratuit et accompagnement personnalisé.",
    href: "/contact",
    tone: "bg-card text-foreground border border-border",
    overlay: "from-card via-card/85 to-card/40",
    img: ATELIER.wide,
  },
];

/**
 * Section "Destinations" — accès direct aux pages clés via des blocs pleins,
 * angles droits, dans les teintes de la palette. Au survol, une image se
 * révèle derrière un voile teinté (le texte reste lisible). Le contraste entre
 * blocs crée la hiérarchie ; les teintes s'adaptent au mode clair / sombre.
 */
export function Destinations() {
  return (
    <section className="bleed py-12 md:py-20">
      <Reveal>
        <div className="mb-8 px-1">
          <p className="kicker">Destinations</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
            Explorer la maison
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {DESTINATIONS.map((d, i) => (
          <Reveal key={d.k} delay={(i % 2) * 0.08}>
            <Link
              href={d.href}
              className={cn(
                "group relative flex min-h-[260px] flex-col justify-between overflow-hidden p-8 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 md:min-h-[340px] md:p-10",
                d.tone
              )}
            >
              {/* Image révélée au survol */}
              <Image
                src={d.img}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-0 transition-all duration-[1100ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:opacity-100"
              />
              {/* Voile teinté (lisibilité du texte) */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-t opacity-0 transition-opacity duration-[1100ms] group-hover:opacity-100",
                  d.overlay
                )}
              />

              {/* Contenu */}
              <div className="relative z-10 flex items-start justify-between">
                <span className="font-serif text-lg tabular-nums opacity-50">
                  {d.k}
                </span>
                <ArrowUpRight
                  className="size-6 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                  strokeWidth={1.4}
                />
              </div>
              <div className="relative z-10">
                <h3 className="font-serif text-3xl leading-none md:text-5xl">
                  {d.title}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-75">
                  {d.text}
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
