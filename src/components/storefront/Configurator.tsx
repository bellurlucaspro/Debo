"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  UploadCloud,
  X,
  Gem,
  Scissors,
  CircleDot,
  Sparkles,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { submitCustomRequest } from "@/server/actions/custom";
import type { StorefrontData } from "@/schemas/material";
import { MOUNTINGS, MATERIALS, CARATS, OCCASIONS } from "@/lib/custom-config";
import { getAppearance, APPEARANCES } from "@/lib/gem-studio/model/appearances";
import {
  applyModifiers,
  slugToGemCut,
  GEM_STYLES,
  GEM_STYLE_PRESETS,
  type GemStyle,
} from "@/lib/gem-studio/model/presets";
import { buildGemSpec } from "@/lib/gem-studio/model/spec";
import { GemControls, type GemControlsValue } from "@/components/storefront/GemControls";

const FALLBACK_OPTICS = APPEARANCES[0]!.optics;

const ConfigGem = dynamic(
  () => import("@/components/storefront/ConfigGem").then((m) => m.ConfigGem),
  { ssr: false, loading: () => null }
);

// Aperçu WebGPU ray-tracé (pierres précieuses). Bascule auto sur ConfigGem si
// WebGPU est indisponible. Les perles (opaques/nacrées) restent sur ConfigGem.
const GemStudioCanvas = dynamic(
  () => import("@/components/storefront/GemStudioCanvas").then((m) => m.GemStudioCanvas),
  { ssr: false, loading: () => null }
);

// Libellés d'allure pour le récapitulatif.
const GEM_STYLE_LABELS = Object.fromEntries(
  GEM_STYLES.map((s) => [s.id, s.label]),
) as Record<string, string>;

function styleLabel(style: GemStyle): string {
  return style === "custom" ? "Sur-mesure" : GEM_STYLE_LABELS[style] ?? "Sur-mesure";
}

const STEPS = [
  { key: "pierre", label: "La pierre", icon: Gem },
  { key: "taille", label: "La taille", icon: Scissors },
  { key: "monture", label: "La monture", icon: CircleDot },
  { key: "projet", label: "Le projet", icon: Sparkles },
  { key: "devis", label: "Le devis", icon: Send },
];

type Inspiration = { id: string; url: string; name: string };

export function Configurator({ materials, diagrams }: StorefrontData) {
  const [step, setStep] = useState(0);

  const firstStone = materials.find((m) => m.kind === "pierre") ?? materials[0];

  // Sélections
  const [family, setFamily] = useState<"perle" | "pierre">(firstStone?.kind ?? "pierre");
  const [materialId, setMaterialId] = useState<string>(firstStone?.id ?? "");
  const [diagramId, setDiagramId] = useState<string>("");

  // Réglages 3D « grand public » (pierres précieuses).
  const [gem, setGem] = useState<GemControlsValue>({
    style: "classique",
    carat: 1.5,
    facets: 3,
    color: 0.6,
    ...GEM_STYLE_PRESETS.classique,
  });

  const applyStyle = (s: Exclude<GemStyle, "custom">) =>
    setGem((g) => ({ ...g, style: s, ...GEM_STYLE_PRESETS[s] }));

  const patchGem = (patch: Partial<GemControlsValue>) =>
    setGem((g) => {
      const touchesShape = "table" in patch || "depth" in patch || "brilliance" in patch;
      return { ...g, ...patch, style: touchesShape ? "custom" : g.style };
    });
  const [mounting, setMounting] = useState<string>("aucune");
  const [material, setMaterial] = useState<string>("or-jaune");
  const [carat, setCarat] = useState<string>("18 ct");
  const [grammage, setGrammage] = useState("");
  const [occasion, setOccasion] = useState("");
  const [message, setMessage] = useState("");
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Coordonnées
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Matière sélectionnée (pierre/perle gérée en admin).
  const stone = useMemo(
    () => materials.find((m) => m.id === materialId) ?? firstStone,
    [materials, materialId, firstStone],
  );

  // Diagrammes disponibles pour cette matière (portées + assignations).
  const availableDiagrams = useMemo(
    () => (stone ? diagrams.filter((d) => stone.diagramIds.includes(d.id)) : []),
    [diagrams, stone],
  );

  // Diagramme sélectionné (par défaut le 1er disponible).
  const diagram = useMemo(
    () => availableDiagrams.find((d) => d.id === diagramId) ?? availableDiagrams[0],
    [availableDiagrams, diagramId],
  );
  const cutSlug = diagram?.slug ?? "round";

  // Optique dérivée de la texture/apparence choisie en admin.
  const optics = useMemo(
    () => getAppearance(stone?.appearance ?? "")?.optics ?? FALLBACK_OPTICS,
    [stone],
  );

  // Design 3D reconstruit à chaque réglage (taille, allure, carats, facettes).
  const gemDesign = useMemo(
    () =>
      applyModifiers(
        diagram
          ? { instructions: diagram.instructions, scaleX: diagram.scaleX, scaleZ: diagram.scaleZ, gear: diagram.gear }
          : { instructions: [], scaleX: 1, scaleZ: 1 },
        {
          optics,
          facets: gem.facets,
          caratTarget: gem.carat,
          table: gem.table,
          depth: gem.depth,
          brilliance: gem.brilliance,
          color: gem.color,
        },
      ),
    [diagram, optics, gem],
  );

  // Sélection d'une matière → on recale le diagramme sur le 1er disponible.
  function pickMaterial(m: { id: string; diagramIds: string[] }) {
    setMaterialId(m.id);
    setDiagramId(m.diagramIds[0] ?? "");
  }

  const hasMounting = mounting !== "aucune";
  const isGold = material.startsWith("or");

  const cutName = diagram?.name ?? "";
  const mountingName = MOUNTINGS.find((m) => m.id === mounting)?.name ?? "";
  const materialName = MATERIALS.find((m) => m.id === material)?.name ?? "";

  // Validation par étape (pour activer "Continuer").
  const canNext = [
    !!materialId,
    !!diagram,
    !!mounting,
    true,
    name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email),
  ][step];

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Inspiration[] = [];
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 8 - inspirations.length)
      .forEach((f) =>
        next.push({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name })
      );
    setInspirations((prev) => [...prev, ...next]);
  }

  function removeInspiration(id: string) {
    setInspirations((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  }

  function submit() {
    setError(null);
    // Fiche technique complète (pierres précieuses) → admin / devis.
    const gemSpec =
      stone?.kind === "pierre"
        ? buildGemSpec(gemDesign, {
            speciesLabel: stone.name,
            cutLabel: cutName,
            styleLabel: styleLabel(gem.style),
          })
        : undefined;

    startTransition(async () => {
      const res = await submitCustomRequest({
        stone: stone?.name ?? "",
        cut: cutName,
        gemKind: stone?.kind ?? "pierre",
        mounting: mountingName,
        material: hasMounting ? materialName : undefined,
        carat: hasMounting && isGold ? carat : undefined,
        grammage: hasMounting ? grammage || undefined : undefined,
        occasion: occasion || undefined,
        message: message || undefined,
        inspirationCount: inspirations.length,
        gemSpec,
        name,
        email,
        phone: phone || undefined,
      });
      if (res.ok) setDone(true);
      else setError(res.message);
    });
  }

  if (done) {
    return (
      <div className="border border-border bg-card p-10 text-center md:p-16">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-6" strokeWidth={1.5} />
        </span>
        <h2 className="mt-6 font-serif text-3xl md:text-4xl">Demande envoyée</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Merci {name.split(" ")[0]}. Clarisse Debost étudie votre projet et vous
          recontacte avec un <span className="text-foreground">devis</span> et des{" "}
          <span className="text-foreground">gouachés</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(320px,420px)] lg:gap-12">
      {/* ───────── Colonne étapes ───────── */}
      <div>
        {/* Indicateur d'étapes */}
        <ol className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const state = i === step ? "active" : i < step ? "done" : "todo";
            return (
              <li key={s.key} className="flex items-center gap-3">
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={cn(
                    "flex items-center gap-2 text-[11px] uppercase tracking-luxe transition-colors",
                    state === "active" && "text-foreground",
                    state === "done" && "text-primary hover:opacity-70",
                    state === "todo" && "text-muted-foreground/50"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 place-items-center border transition-colors",
                      state === "active" && "border-primary bg-primary text-primary-foreground",
                      state === "done" && "border-primary text-primary",
                      state === "todo" && "border-border"
                    )}
                  >
                    {state === "done" ? (
                      <Check className="size-3.5" strokeWidth={2} />
                    ) : (
                      <Icon className="size-3.5" strokeWidth={1.6} />
                    )}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className="h-px w-5 bg-border" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>

        {/* ÉTAPE 0 — Pierre */}
        {step === 0 && (
          <Step title="Choisissez votre pierre brute" hint="Elle sera taillée à la main selon votre configuration.">
            <div className="mb-6 inline-flex border border-border p-1">
              {(["pierre", "perle"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFamily(f);
                    const first = materials.find((mm) => mm.kind === f);
                    if (first) pickMaterial(first);
                  }}
                  className={cn(
                    "px-5 py-2 text-[11px] uppercase tracking-luxe transition-colors",
                    family === f ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "pierre" ? "Pierres précieuses" : "Perles de culture"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {materials
                .filter((s) => s.kind === family)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pickMaterial(s)}
                    className={cn(
                      "group flex flex-col items-start gap-3 border p-4 text-left transition-all",
                      materialId === s.id ? "border-primary bg-foreground/[0.03]" : "border-border hover:border-foreground/40"
                    )}
                  >
                    <span
                      className="size-10 rounded-full border border-border shadow-inner"
                      style={{ backgroundColor: s.colorHex }}
                    />
                    <span>
                      <span className="block font-serif text-lg leading-tight">{s.name}</span>
                      {s.blurb && (
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{s.blurb}</span>
                      )}
                    </span>
                  </button>
                ))}
            </div>
          </Step>
        )}

        {/* ÉTAPE 1 — Taille */}
        {step === 1 && (
          <Step title="Le diagramme de taille" hint="La géométrie qui révélera le feu de votre pierre.">
            {availableDiagrams.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucun diagramme n'est encore proposé pour cette matière.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {availableDiagrams.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDiagramId(d.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 border p-4 text-left transition-all",
                    diagram?.id === d.id ? "border-primary bg-foreground/[0.03]" : "border-border hover:border-foreground/40"
                  )}
                >
                  <span className="font-serif text-lg leading-tight">{d.name}</span>
                  {d.description && (
                    <span className="text-xs leading-snug text-muted-foreground">{d.description}</span>
                  )}
                </button>
              ))}
            </div>

            {family === "pierre" && (
              <GemControls value={gem} onStyle={applyStyle} onChange={patchGem} />
            )}
          </Step>
        )}

        {/* ÉTAPE 2 — Monture & matière */}
        {step === 2 && (
          <Step title="La monture" hint="Pierre seule, ou montée sur une création.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MOUNTINGS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMounting(m.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 border p-4 text-left transition-all",
                    mounting === m.id ? "border-primary bg-foreground/[0.03]" : "border-border hover:border-foreground/40"
                  )}
                >
                  <span className="font-serif text-lg leading-tight">{m.name}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{m.desc}</span>
                </button>
              ))}
            </div>

            {hasMounting && (
              <div className="mt-8 space-y-7 border-t border-border pt-7">
                <div>
                  <p className="kicker mb-3">Matière</p>
                  <div className="flex flex-wrap gap-3">
                    {MATERIALS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMaterial(m.id)}
                        className={cn(
                          "flex items-center gap-2.5 border py-2 pl-2 pr-4 text-sm transition-all",
                          material === m.id ? "border-primary" : "border-border hover:border-foreground/40"
                        )}
                      >
                        <span
                          className="size-6 rounded-full border border-border"
                          style={{ backgroundColor: m.swatch }}
                        />
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {isGold && (
                  <div>
                    <p className="kicker mb-3">Titre de l'or</p>
                    <div className="flex flex-wrap gap-2">
                      {CARATS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCarat(c)}
                          className={cn(
                            "border px-4 py-2 text-sm transition-all",
                            carat === c ? "border-primary bg-foreground/[0.03]" : "border-border hover:border-foreground/40"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="kicker mb-3">Grammage souhaité (indicatif)</p>
                  <div className="flex items-center gap-2 border border-border px-3 py-2 focus-within:border-foreground sm:w-56">
                    <input
                      value={grammage}
                      onChange={(e) => setGrammage(e.target.value)}
                      inputMode="decimal"
                      placeholder="ex. 4,5"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <span className="text-sm text-muted-foreground">g</span>
                  </div>
                </div>
              </div>
            )}
          </Step>
        )}

        {/* ÉTAPE 3 — Projet & inspirations */}
        {step === 3 && (
          <Step title="Votre projet" hint="L'occasion, vos envies, vos inspirations.">
            <div>
              <p className="kicker mb-3">Pour quelle occasion ?</p>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setOccasion(o === occasion ? "" : o)}
                    className={cn(
                      "border px-4 py-2 text-sm transition-all",
                      occasion === o ? "border-primary bg-foreground/[0.03]" : "border-border hover:border-foreground/40"
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="kicker mb-3">Décrivez votre envie</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Une histoire, un style, des contraintes, un budget approximatif…"
                className="w-full resize-none border border-border bg-transparent p-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
              />
            </div>

            <div className="mt-7">
              <p className="kicker mb-3">Inspirations (glisser-déposer)</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInput.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors",
                  dragOver ? "border-primary bg-primary/[0.04]" : "border-border hover:border-foreground/40"
                )}
              >
                <UploadCloud className="size-6 text-muted-foreground" strokeWidth={1.4} />
                <p className="text-sm text-muted-foreground">
                  Déposez vos images ici, ou <span className="text-foreground underline underline-offset-2">parcourez</span> (max 8)
                </p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {inspirations.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {inspirations.map((img) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeInspiration(img.id);
                        }}
                        aria-label="Retirer"
                        className="absolute right-1 top-1 grid size-6 place-items-center bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3.5" strokeWidth={1.6} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Step>
        )}

        {/* ÉTAPE 4 — Coordonnées + récap */}
        {step === 4 && (
          <Step title="Vos coordonnées" hint="Pour vous envoyer le devis et les gouachés.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </Field>
              <Field label="E-mail" required>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </Field>
              <Field label="Téléphone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </Field>
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              Cette demande est sans engagement. Clarisse Debost revient vers vous
              avec une proposition chiffrée et des gouachés (dessins) de la pièce.
            </p>
          </Step>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-luxe text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft className="size-4" strokeWidth={1.6} />
            Précédent
          </button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continuer
              <ArrowRight className="size-4" strokeWidth={1.6} />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!canNext || pending}>
              {pending ? "Envoi…" : "Envoyer ma demande"}
              <Send className="size-4" strokeWidth={1.6} />
            </Button>
          )}
        </div>
      </div>

      {/* ───────── Colonne aperçu + résumé (sticky) ───────── */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-border bg-card">
          <div className="relative aspect-square w-full border-b border-border">
            {stone?.kind === "pierre" ? (
              <GemStudioCanvas
                design={gemDesign}
                fallbackColor={stone.colorHex}
                fallbackCut={slugToGemCut(cutSlug)}
                className="absolute inset-0"
              />
            ) : (
              <ConfigGem
                color={stone?.colorHex ?? "#cccccc"}
                cut={slugToGemCut(cutSlug)}
                refractive={false}
                className="!h-full !w-full"
              />
            )}
            <span className="absolute bottom-3 left-4 text-[11px] uppercase tracking-luxe text-muted-foreground">
              Aperçu — {cutName}
            </span>
          </div>
          <dl className="divide-y divide-border text-sm">
            <Row label="Pierre" value={stone?.name ?? ""} />
            <Row label="Taille" value={cutName} />
            {stone?.kind === "pierre" && (
              <>
                <Row label="Allure" value={styleLabel(gem.style)} />
                <Row label="Poids" value={`~ ${gem.carat.toFixed(2)} ct`} />
              </>
            )}
            <Row label="Monture" value={mountingName} />
            {hasMounting && <Row label="Matière" value={isGold ? `${materialName} · ${carat}` : materialName} />}
            {hasMounting && grammage && <Row label="Grammage" value={`${grammage} g`} />}
            {occasion && <Row label="Occasion" value={occasion} />}
            {inspirations.length > 0 && <Row label="Inspirations" value={`${inspirations.length} image${inspirations.length > 1 ? "s" : ""}`} />}
          </dl>
        </div>
        <p className="mt-3 text-center text-[11px] uppercase tracking-luxe text-muted-foreground">
          Pièce unique · taillée à la main · certifiée
        </p>
      </aside>
    </div>
  );
}

/* ── petits sous-composants ── */
function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl leading-tight md:text-3xl">{title}</h2>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-luxe text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <dt className="text-[11px] uppercase tracking-luxe text-muted-foreground">{label}</dt>
      <dd className="text-right font-serif text-base">{value}</dd>
    </div>
  );
}
