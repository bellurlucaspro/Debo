"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { gsap, useGSAP } from "@/lib/gsap";
import { SHOWCASE } from "@/lib/images";

/**
 * Défilé horizontal "Vedettes" — réf. quiet-luxury (Polène).
 * Section épinglée : à l'entrée le rang est zoomé sur la 1re pièce puis dézoome
 * (révélation), ensuite il défile horizontalement au scroll vertical. Les
 * gemmes sont détourées via `mix-blend-multiply` (le blanc des photos disparaît
 * sur le beige). Repli propre en reduced-motion (défilement natif).
 */
export function FeaturedShowcase() {
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const trackEl = track.current;
      const pinEl = pin.current;
      if (!trackEl || !pinEl) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        trackEl.style.overflowX = "auto";
        return;
      }

      const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);
      gsap.set(trackEl, { transformOrigin: "left center" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          start: "top top",
          end: () => `+=${distance() + window.innerHeight}`,
          pin: pinEl,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progress.current)
              gsap.set(progress.current, { scaleX: self.progress });
          },
        },
      });

      // Zoom d'entrée léger → dézoom (révélation du rang), puis pan horizontal.
      tl.fromTo(
        trackEl,
        { scale: 1.12 },
        { scale: 1, ease: "power2.out", duration: 0.14 }
      ).to(trackEl, { x: () => -distance(), ease: "none", duration: 1 }, 0.14);
    },
    { scope: pin }
  );

  return (
    <section className="relative">
      <div
        ref={pin}
        className="relative flex h-dvh flex-col justify-center overflow-hidden bg-background"
      >
        {/* En-tête */}
        <div className="bleed flex items-end justify-between pb-[3vh] pt-[12vh]">
          <div>
            <p className="kicker">Vedettes</p>
            <h2 className="mt-3 font-serif text-4xl leading-none md:text-6xl">
              Pièces signature
            </h2>
          </div>
          <span className="hidden items-center gap-3 text-[11px] uppercase tracking-luxe text-muted-foreground md:inline-flex">
            Faites défiler
            <ArrowRight className="size-3.5" strokeWidth={1.4} />
          </span>
        </div>

        {/* Rang horizontal */}
        <div
          ref={track}
          className="flex items-center gap-[6vw] px-[8vw] will-change-transform"
        >
          {SHOWCASE.map((item, i) => (
            <article
              key={item.name}
              className="group flex h-[50vh] w-[80vw] shrink-0 flex-col sm:w-[52vw] lg:w-[32vw]"
            >
              <Link
                href={item.href}
                className="relative flex-1 overflow-hidden"
                aria-label={item.name}
              >
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 52vw, 32vw"
                  className="object-contain mix-blend-multiply transition-transform duration-[1200ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                  priority={i < 2}
                />
              </Link>
              <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                    {item.type}
                  </p>
                  <h3 className="mt-1 font-serif text-xl leading-none md:text-2xl">
                    {item.name}
                  </h3>
                </div>
                <span className="shrink-0 font-serif text-sm tabular-nums text-foreground/70">
                  {item.price}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Barre de progression horizontale */}
        <div className="bleed mt-[4vh]">
          <div className="h-px w-full bg-border">
            <div
              ref={progress}
              className="h-full origin-left scale-x-0 bg-primary"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
