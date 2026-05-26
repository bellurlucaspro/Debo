"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const STATEMENT =
  "La lumière entre, rebondit, ressort transformée. Chaque perle facettée est unique — vivante, taillée à la main, signée DEBO.";

/**
 * Manifeste à révélation mot-à-mot. Au défilement (scrub), chaque mot passe de
 * l'estompé à l'encre pleine — la phrase s'écrit sous les yeux. Le mot signature
 * s'allume en ruby. Repli lisible en reduced-motion.
 */
export function Manifesto() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const words = gsap.utils.toArray<HTMLElement>(".mf-word");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(words, { opacity: 1 });
        return;
      }
      gsap.set(words, { opacity: 0.14 });
      gsap.to(words, {
        opacity: 1,
        ease: "none",
        stagger: 0.4,
        scrollTrigger: {
          trigger: root.current,
          start: "top 72%",
          end: "bottom 58%",
          scrub: true,
        },
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="bleed py-6 md:py-8">
      <div className="bg-foreground px-7 py-[14vh] text-background md:px-20 md:py-[16vh]">
        <p className="kicker mb-10 text-background/60">Le manifeste</p>
        <p
          className="max-w-5xl font-serif font-light leading-[1.12]"
          style={{ fontSize: "clamp(1.9rem, 5vw, 4.5rem)" }}
        >
          {STATEMENT.split(" ").map((w, i) => (
            <span key={i} className="mf-word">
              {w}{" "}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
