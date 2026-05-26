"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  GEM_STYLES,
  FACET_MIN,
  FACET_MAX,
  CARAT_MIN,
  CARAT_MAX,
  type GemStyle,
} from "@/lib/gem-studio/model/presets";

export interface GemControlsValue {
  style: GemStyle;
  carat: number;
  facets: number;
  color: number;
  table: number;
  depth: number;
  brilliance: number;
}

/**
 * Réglages « grand public » de la pierre (aucun jargon lapidaire).
 * Visible : Allure · Taille · Couleur · Facettes.
 * Repliable « Affiner » : Table · Galbe · Éclat.
 */
export function GemControls({
  value,
  onStyle,
  onChange,
}: {
  value: GemControlsValue;
  onStyle: (s: Exclude<GemStyle, "custom">) => void;
  onChange: (patch: Partial<GemControlsValue>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 space-y-7 border-t border-border pt-7">
      {/* Allure */}
      <div>
        <p className="kicker mb-3">Allure</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GEM_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStyle(s.id)}
              className={cn(
                "flex flex-col items-start gap-0.5 border px-3 py-2.5 text-left transition-all",
                value.style === s.id
                  ? "border-primary bg-foreground/[0.03]"
                  : "border-border hover:border-foreground/40",
              )}
            >
              <span className="font-serif text-base leading-tight">{s.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{s.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Taille */}
      <Slider
        label="Taille"
        readout={`${value.carat.toFixed(2)} ct`}
        min={CARAT_MIN}
        max={CARAT_MAX}
        step={0.05}
        value={value.carat}
        onChange={(carat) => onChange({ carat })}
        left="Délicate"
        right="Imposante"
      />

      {/* Couleur */}
      <Slider
        label="Couleur"
        min={0}
        max={1}
        step={0.01}
        value={value.color}
        onChange={(color) => onChange({ color })}
        left="Tendre"
        right="Intense"
      />

      {/* Facettes */}
      <Slider
        label="Facettes"
        min={FACET_MIN}
        max={FACET_MAX}
        step={1}
        value={value.facets}
        onChange={(facets) => onChange({ facets })}
        left="Épuré"
        right="Détaillé"
      />

      {/* Réglages avancés */}
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between border-t border-border pt-5 text-[11px] uppercase tracking-luxe text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-3.5" strokeWidth={1.6} />
            Affiner la taille
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} strokeWidth={1.6} />
        </button>

        {open && (
          <div className="mt-6 space-y-7">
            <Slider
              label="Table"
              min={0}
              max={1}
              step={0.01}
              value={value.table}
              onChange={(table) => onChange({ table })}
              left="Petite"
              right="Grande"
            />
            <Slider
              label="Galbe"
              min={0}
              max={1}
              step={0.01}
              value={value.depth}
              onChange={(depth) => onChange({ depth })}
              left="Plate"
              right="Profonde"
            />
            <Slider
              label="Éclat"
              min={0}
              max={1}
              step={0.01}
              value={value.brilliance}
              onChange={(brilliance) => onChange({ brilliance })}
              left="Doux"
              right="Éclatant"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  readout,
  min,
  max,
  step,
  value,
  onChange,
  left,
  right,
}: {
  label: string;
  readout?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="kicker">{label}</p>
        {readout && <span className="font-serif text-lg text-foreground">{readout}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="gem-range"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[11px] uppercase tracking-luxe text-muted-foreground">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
