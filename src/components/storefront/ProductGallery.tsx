"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string | null };

/**
 * Galerie PDP : image principale (zoom doux au survol) + miniatures.
 * Le changement d'image se fait en fondu GSAP.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);

  function select(i: number) {
    if (i === active) return;
    setActive(i);
    if (mainRef.current) {
      gsap.fromTo(
        mainRef.current,
        { autoAlpha: 0.3, scale: 1.02 },
        { autoAlpha: 1, scale: 1, duration: 0.6, ease: "debo-soft" }
      );
    }
  }

  const cover = images[active];

  return (
    <div className="flex flex-col gap-4">
      <div className="halo-surface relative aspect-[4/5] overflow-hidden rounded-sm border border-border bg-secondary">
        <div ref={mainRef} className="absolute inset-0">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt ?? name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-transform [transition-duration:1200ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              Visuel à venir
            </div>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => select(i)}
              aria-label={`Visuel ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-sm border transition-colors",
                i === active
                  ? "border-foreground"
                  : "border-border hover:border-foreground/60"
              )}
            >
              <Image
                src={img.url}
                alt={img.alt ?? `${name} ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
