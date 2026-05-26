"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";

const CHAPTERS = [
  {
    index: "01",
    title: "L'huître",
    text: "Tout commence par une perle de culture brute, ronde, encore silencieuse. La nacre dort sous la surface.",
  },
  {
    index: "02",
    title: "La taille",
    text: "À la main, facette après facette, Clarisse ouvre des fenêtres dans la nacre. Chaque angle décide d'un reflet.",
  },
  {
    index: "03",
    title: "L'éclat",
    text: "La lumière entre, rebondit, ressort transformée. La perle facettée est née — unique, vivante, signée DEBO.",
  },
];

/**
 * Storytelling au défilement. La section est épinglée (pin) pendant que les
 * chapitres se succèdent en fondu, que le décor s'éclaircit (ombre → lumière)
 * et qu'un compteur monte jusqu'à 57 facettes. Coupé en reduced-motion (les
 * chapitres s'affichent alors empilés, lisibles sans animation).
 */
export function ScrollStory() {
  const root = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduce) return; // chapitres déjà visibles (CSS)

      const chapters = gsap.utils.toArray<HTMLElement>(".story-chapter");
      gsap.set(chapters.slice(1), { autoAlpha: 0, yPercent: 8 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "+=260%",
          scrub: 0.6,
          pin: pin.current,
          anticipatePin: 1,
        },
      });

      // Enchaînement des chapitres (fond beige unique, narration par le texte).
      const [ch0, ch1, ch2] = chapters;
      if (!ch0 || !ch1 || !ch2) return;
      tl.to(ch0, { autoAlpha: 0, yPercent: -8, duration: 0.5 }, 0.6)
        .to(ch1, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, "<")
        .to(ch1, { autoAlpha: 0, yPercent: -8, duration: 0.5 }, 1.6)
        .to(ch2, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, "<");

      // Compteur de facettes + barre de progression, pilotés par le scroll.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "+=260%",
        scrub: 0.6,
        onUpdate: (self) => {
          if (counter.current) {
            counter.current.textContent = Math.round(
              self.progress * 57
            ).toString();
          }
          if (progress.current) {
            gsap.set(progress.current, { scaleX: self.progress });
          }
        },
      });
    },
    { scope: root }
  );

  return (
    <div ref={root} className="relative">
      <div
        ref={pin}
        className="relative flex h-dvh items-center overflow-hidden bg-background text-foreground"
      >
        {/* Compteur de facettes géant en filigrane */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-[40vw] leading-none text-foreground/[0.05]">
            <span ref={counter}>0</span>
          </span>
        </div>

        <div className="section-shell relative">
          <p className="kicker">La naissance d'une perle facettée</p>

          <div className="relative mt-8 h-[40vh] max-w-2xl">
            {CHAPTERS.map((c) => (
              <div
                key={c.index}
                className="story-chapter absolute inset-0"
              >
                <span className="font-serif text-sm text-muted-foreground">
                  {c.index} — {c.title}
                </span>
                <p className="mt-4 text-balance font-serif text-3xl leading-snug md:text-5xl md:leading-[1.15]">
                  {c.text}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs uppercase tracking-luxe text-muted-foreground">
            Jusqu'à 57 facettes ciselées à la main
          </p>
        </div>

        {/* Barre de progression */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-border">
          <div
            ref={progress}
            className="h-full origin-left scale-x-0 bg-primary"
          />
        </div>
      </div>
    </div>
  );
}
