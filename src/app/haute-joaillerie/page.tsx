import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { LineReveal } from "@/components/system/LineReveal";
import { Reveal } from "@/components/system/Reveal";
import { Parallax } from "@/components/system/Parallax";
import { Button } from "@/components/ui/button";
import { UNIVERSES } from "@/lib/images";

export const metadata: Metadata = {
  title: "Haute joaillerie",
  description:
    "Haute joaillerie sur-mesure par Clarisse Debost : une pièce d'exception née de vos inspirations, dessinée et taillée à la main, certifiée.",
};

export default function HauteJoailleriePage() {
  return (
    <section className="section-shell pb-28 pt-28 md:pt-36">
      <Reveal>
        <p className="kicker">Haute joaillerie</p>
      </Reveal>
      <LineReveal
        as="h1"
        className="mt-5 font-serif font-light leading-[0.95] text-foreground"
        style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}
        lines={[
          "La pièce",
          <span key="2" className="italic text-primary">
            d'exception.
          </span>,
        ]}
      />

      <div className="mt-14 grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden border border-border">
            <Parallax amount={12}>
              <Image
                src={UNIVERSES.hauteJoaillerie}
                alt="Haute joaillerie — pièce unique"
                fill
                sizes="(max-width: 768px) 100vw, 48vw"
                className="object-cover"
              />
            </Parallax>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Une création née de vos inspirations. Déposez vos références, une
              gemme de cœur, une histoire — Clarisse Debost dessine, taille et
              sertit le reste.{" "}
              <span className="font-medium text-foreground">
                Pièce unique, signée et certifiée.
              </span>
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
              Chaque commande est un dialogue : esquisses, choix de la matière,
              proportions, monture. Le temps qu'il faut pour l'unique.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <Button size="lg" asChild className="mt-8">
              <Link href="/contact">
                Démarrer un projet
                <ArrowRight className="size-4" strokeWidth={1.6} />
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
