"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Carrousel de pierres taillées (détourées) — remplace la perle 3D.
 * Chaque pierre est présentée tour à tour (zoom + crossfade), alignée à droite
 * pour que la pince affleure le bord droit du conteneur. Mini-cartes cliquables
 * en bas à droite : aperçu de la séquence, barre de compte à rebours sur la
 * carte active. Rotation auto coupée en prefers-reduced-motion.
 *
 * → Visuels : public/gems/gem-1.png … gem-5.png
 */
const GEMS = [
  { src: "/gems/gem-1.png", name: "Tourmaline pastèque" },
  { src: "/gems/gem-2.png", name: "Émeraude" },
  { src: "/gems/gem-3.png", name: "Tourmaline bicolore" },
  { src: "/gems/gem-4.png", name: "Tanzanite" },
  { src: "/gems/gem-5.png", name: "Quartz mystique" },
];

const INTERVAL = 4000;

export function GemShowcase() {
  const [active, setActive] = useState(0);
  const [reduce, setReduce] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function start() {
    window.clearInterval(timer.current);
    timer.current = window.setInterval(
      () => setActive((a) => (a + 1) % GEMS.length),
      INTERVAL
    );
  }

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduce(true);
      return;
    }
    start();
    return () => window.clearInterval(timer.current);
  }, []);

  function go(i: number) {
    setActive(i);
    if (!reduce) start();
  }

  return (
    <div className="relative h-full w-full">
      {GEMS.map((g, i) => (
        <Image
          key={g.src}
          src={g.src}
          alt={g.name}
          fill
          sizes="60vw"
          priority={i === 0}
          className={cn(
            "object-contain object-right transition-all duration-[1300ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
            i === active ? "scale-100 opacity-100" : "scale-[1.12] opacity-0"
          )}
        />
      ))}

      {/* Légende + mini-cartes (séquence) */}
      <div className="pointer-events-none absolute bottom-3 right-4 z-10 flex flex-col items-end md:bottom-6 md:right-6">
        <p className="font-serif text-lg text-foreground md:text-xl">
          {GEMS[active]?.name}
        </p>
        <div className="pointer-events-auto mt-3 flex justify-end gap-2 md:gap-2.5">
          {GEMS.map((g, i) => (
            <button
              key={g.src}
              onClick={() => go(i)}
              aria-label={`Voir ${g.name}`}
              aria-current={i === active}
              className={cn(
                "group relative size-12 shrink-0 overflow-hidden border bg-foreground/[0.04] backdrop-blur-sm transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:size-16 lg:size-[4.5rem]",
                i === active
                  ? "-translate-y-1 border-primary opacity-100 shadow-[0_10px_26px_-10px_hsl(var(--primary)/0.55)]"
                  : "border-border/60 opacity-50 hover:-translate-y-0.5 hover:border-foreground/40 hover:opacity-100"
              )}
            >
              <Image
                src={g.src}
                alt=""
                aria-hidden
                fill
                sizes="72px"
                className={cn(
                  "object-contain p-1.5 transition-transform duration-500",
                  i === active ? "scale-100" : "scale-90 group-hover:scale-100"
                )}
              />
              {/* Compte à rebours sur la carte active */}
              {i === active && !reduce && (
                <span
                  className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-primary"
                  style={{ animation: `gemprogress ${INTERVAL}ms linear` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
