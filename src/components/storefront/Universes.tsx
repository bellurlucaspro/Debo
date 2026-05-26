import Link from "next/link";
import Image from "next/image";

import { Reveal } from "@/components/system/Reveal";
import { cn } from "@/lib/utils";
import { UNIVERSES as UNIVERSE_IMG } from "@/lib/images";

type Universe = {
  title: string;
  text: string;
  href: string;
  tone: "light" | "shadow";
  image: string;
};

const UNIVERSES: Universe[] = [
  {
    title: "Perles facettées",
    text: "La signature de la maison. Perles de culture taillées à la main, du nacré au noir d'encre.",
    href: "/shop?category=perles-facettees",
    tone: "light",
    image: UNIVERSE_IMG.perles,
  },
  {
    title: "Pierres précieuses",
    text: "Saphirs, topazes, pierres de caractère — taillées pour révéler leur feu.",
    href: "/shop?category=pierres-precieuses",
    tone: "shadow",
    image: UNIVERSE_IMG.pierres,
  },
  {
    title: "Sur-mesure",
    text: "Composez votre perle ou votre pierre : diagramme, facettage, dimensions, teinte, monture.",
    href: "/sur-mesure",
    tone: "shadow",
    image: UNIVERSE_IMG.surMesure,
  },
  {
    title: "Haute joaillerie",
    text: "Une pièce unique, née de vos inspirations. Déposez vos références, nous dessinons le reste.",
    href: "/haute-joaillerie",
    tone: "light",
    image: UNIVERSE_IMG.hauteJoaillerie,
  },
];

/**
 * Les 4 univers DEBO en cartes éditoriales, alternant écrins d'ombre et
 * surfaces de lumière, révélées au défilement.
 */
export function Universes() {
  return (
    <section className="section-shell py-24 md:py-32">
      <Reveal>
        <p className="kicker">Explorer</p>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight md:text-6xl">
          Quatre manières de faire entrer la lumière.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {UNIVERSES.map((u, i) => (
          <Reveal key={u.title} delay={(i % 2) * 0.08}>
            <Link
              href={u.href}
              className={cn(
                "halo-surface group relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-sm border border-border p-8 md:min-h-[400px] md:p-10",
                u.tone === "shadow"
                  ? "bg-midnight text-offwhite"
                  : "bg-offwhite text-midnight"
              )}
            >
              {u.image && (
                <>
                  <Image
                    src={u.image}
                    alt={u.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover opacity-60 transition-transform [transition-duration:1.2s] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  />
                  <div
                    className={cn(
                      "absolute inset-0",
                      u.tone === "shadow"
                        ? "bg-gradient-to-t from-midnight via-midnight/55 to-midnight/10"
                        : "bg-gradient-to-t from-offwhite via-offwhite/60 to-offwhite/10"
                    )}
                  />
                </>
              )}

              <div className="relative z-[2]">
                <span
                  className={cn(
                    "font-serif text-sm tabular-nums",
                    u.tone === "shadow" ? "text-offwhite/50" : "text-foreground/40"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-serif text-2xl md:text-3xl">{u.title}</h3>
                <p
                  className={cn(
                    "mt-3 max-w-sm text-sm",
                    u.tone === "shadow"
                      ? "text-offwhite/70"
                      : "text-muted-foreground"
                  )}
                >
                  {u.text}
                </p>
                <span className="mt-5 inline-block text-[11px] uppercase tracking-luxe">
                  Découvrir →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
