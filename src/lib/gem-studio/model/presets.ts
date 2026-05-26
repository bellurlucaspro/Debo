/**
 * Gem Studio — Réglages « grand public » + diagrammes de base.
 *
 * NOUVEAU MODÈLE (piloté par l'admin) :
 *   - Un DIAGRAMME = un programme de facettage de base (`DiagramProgram`) :
 *     la liste canonique des facettes (angle/index/profondeur/répétition) +
 *     la silhouette. C'est la transcription d'un diagramme PDF de lapidaire.
 *     Ces diagrammes vivent en base (`CutDiagram`) et sont gérés depuis l'admin.
 *   - Les RÉGLAGES visiteur (`ModifierChoice`) s'appliquent PAR-DESSUS n'importe
 *     quel diagramme via `applyModifiers()` → tout diagramme ajouté est
 *     automatiquement personnalisable, sans code.
 *
 * Les 6 tailles historiques sont ici sous forme de `BASE_DIAGRAMS` : elles
 * servent à amorcer la base (seed « système ») et de repli si la base est vide.
 */

import type { GemCut } from "@/lib/custom-config";
import {
  caratsToDimensions,
  type FacetInstruction,
  type GemDesign,
  type OpticalProperties,
} from "./design";

/* ── Vocabulaire UI ───────────────────────────────────────────────────────── */

export type GemStyle = "classique" | "eclatant" | "vintage" | "delicat" | "custom";

export const GEM_STYLES: { id: Exclude<GemStyle, "custom">; label: string; blurb: string }[] = [
  { id: "classique", label: "Classique", blurb: "Le diagramme d'origine." },
  { id: "eclatant", label: "Éclatant", blurb: "Un maximum de feu." },
  { id: "vintage", label: "Vintage", blurb: "Grande table, douceur rétro." },
  { id: "delicat", label: "Délicat", blurb: "Léger, tout en finesse." },
];

/** Une Allure = un jeu de curseurs (0..1). 0.5 = neutre (diagramme tel quel). */
export const GEM_STYLE_PRESETS: Record<
  Exclude<GemStyle, "custom">,
  { table: number; depth: number; brilliance: number }
> = {
  classique: { table: 0.5, depth: 0.5, brilliance: 0.5 },
  eclatant: { table: 0.3, depth: 0.72, brilliance: 0.9 },
  vintage: { table: 0.85, depth: 0.35, brilliance: 0.18 },
  delicat: { table: 0.5, depth: 0.25, brilliance: 0.15 },
};

export const FACET_MIN = 0;
export const FACET_MAX = 4;
export const CARAT_MIN = 0.3;
export const CARAT_MAX = 5;

/* ── Réglages → transformations (jamais montrés au visiteur) ──────────────── */

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp01(t);

export interface ModifierChoice {
  /** Optique de l'apparence choisie (pilote couleur + densité/carats). */
  optics: OpticalProperties;
  caratTarget: number;
  /** Index 0..4. */
  facets: number;
  table: number;
  depth: number;
  brilliance: number;
  color: number;
}

/** Programme de facettage de base (transcription d'un diagramme). */
export interface DiagramProgram {
  instructions: FacetInstruction[];
  scaleX: number;
  scaleZ: number;
  /** Denture de la roue d'index (import GemCAD). Défaut 96. */
  gear?: number;
}

/**
 * Applique les réglages grand public sur un programme de base → `GemDesign`.
 * Les angles sont DÉCALÉS autour du diagramme (curseur 0.5 = inchangé) ; les
 * répétitions des facettes sont mises à l'échelle ; couleur/taille sont libres.
 */
export function applyModifiers(base: DiagramProgram, m: ModifierChoice, id = "live"): GemDesign {
  const optBase = m.optics;
  const dims = caratsToDimensions(m.caratTarget, optBase.density);

  const crownDelta = (m.brilliance - 0.5) * 16; // ±8°
  const pavDelta = (m.depth - 0.5) * 8; // ±4°
  const tableMul = lerp(1.25, 0.78, m.table); // grande table = facette plus large
  const culetDelta = (m.depth - 0.5) * 0.3;
  const facetMul = lerp(0.55, 1.7, m.facets / FACET_MAX);
  const absMul = lerp(0.45, 1.9, m.color);

  const instructions: FacetInstruction[] = base.instructions.map((i) => {
    if (i.tier === "crown") {
      return { ...i, angle: clamp(i.angle + crownDelta, 16, 56), repeat: facetScale(i.repeat, facetMul) };
    }
    if (i.tier === "pavilion") {
      return { ...i, angle: clamp(i.angle + pavDelta, 30, 56), repeat: facetScale(i.repeat, facetMul) };
    }
    if (i.tier === "table") return { ...i, depth: i.depth * tableMul };
    if (i.tier === "culet") return { ...i, depth: Math.max(0, i.depth + culetDelta) };
    return i; // rondiste : inchangé (lissage)
  });

  const optics: OpticalProperties = {
    ...optBase,
    absorption: [
      optBase.absorption[0] * absMul,
      optBase.absorption[1] * absMul,
      optBase.absorption[2] * absMul,
    ],
  };

  return {
    id,
    optics,
    girdleDiameterMm: dims.girdleDiameterMm,
    totalDepthMm: dims.totalDepthMm,
    indexGear: base.gear ?? 96,
    silhouette: base.scaleX === 1 && base.scaleZ === 1 ? undefined : { scaleX: base.scaleX, scaleZ: base.scaleZ },
    viewScale: caratToViewScale(m.caratTarget),
    instructions,
    revision: 0,
  };
}

/* ── Diagrammes « système » (transcriptions canoniques) ───────────────────── */

export interface BaseDiagramSeed {
  slug: string;
  name: string;
  family: "pierre" | "perle";
  description: string;
  program: DiagramProgram;
}

const round: FacetInstruction[] = [
  { tier: "table", angle: 90, index: 0, depth: 0.31, repeat: 1 }, // ~55 % de table
  { tier: "crown", angle: 34.5, index: 0, depth: 0, repeat: 8 },
  { tier: "crown", angle: 40.5, index: 4, depth: 0, repeat: 8 },
  { tier: "girdle", angle: 0, index: 0, depth: 1, repeat: 32 },
  { tier: "pavilion", angle: 40.75, index: 0, depth: 0, repeat: 8 },
  { tier: "pavilion", angle: 42, index: 4, depth: 0, repeat: 8 },
  { tier: "culet", angle: 0, index: 0, depth: 0.92, repeat: 1 }, // pointe (pas de méplat)
];

const cushion: FacetInstruction[] = [
  { tier: "table", angle: 90, index: 0, depth: 0.33, repeat: 1 },
  { tier: "crown", angle: 35, index: 0, depth: 0, repeat: 8 },
  { tier: "crown", angle: 41, index: 4, depth: 0, repeat: 8 },
  { tier: "girdle", angle: 0, index: 0, depth: 1, repeat: 12 },
  { tier: "pavilion", angle: 40, index: 0, depth: 0, repeat: 8 },
  { tier: "pavilion", angle: 42, index: 4, depth: 0, repeat: 8 },
  { tier: "culet", angle: 0, index: 0, depth: 0.9, repeat: 1 },
];

const emerald: FacetInstruction[] = [
  { tier: "table", angle: 90, index: 0, depth: 0.18, repeat: 1 },
  { tier: "crown", angle: 50, index: 0, depth: 0, repeat: 8 },
  { tier: "crown", angle: 34, index: 0, depth: 0, repeat: 8 },
  { tier: "crown", angle: 20, index: 0, depth: 0, repeat: 8 },
  { tier: "girdle", angle: 0, index: 0, depth: 1, repeat: 8 },
  { tier: "pavilion", angle: 50, index: 0, depth: 0, repeat: 8 },
  { tier: "pavilion", angle: 42, index: 0, depth: 0, repeat: 8 },
  { tier: "culet", angle: 0, index: 0, depth: 0.9, repeat: 1 },
];

const rose: FacetInstruction[] = [
  { tier: "girdle", angle: 0, index: 0, depth: 1, repeat: 24 },
  { tier: "crown", angle: 55, index: 0, depth: 0, repeat: 8 },
  { tier: "crown", angle: 38, index: 4, depth: 0, repeat: 8 },
  { tier: "culet", angle: 0, index: 0, depth: 0, repeat: 1 }, // fond plat à y=0
];

export const BASE_DIAGRAMS: BaseDiagramSeed[] = [
  { slug: "round", name: "Brillant rond", family: "pierre", description: "Le maximum de feu et d'éclat.", program: { instructions: round, scaleX: 1, scaleZ: 1 } },
  { slug: "emerald", name: "Taille émeraude", family: "pierre", description: "Lignes nettes, élégance Art déco.", program: { instructions: emerald, scaleX: 0.78, scaleZ: 1.15 } },
  { slug: "pear", name: "Poire", family: "pierre", description: "Goutte gracieuse, allonge le doigt.", program: { instructions: round, scaleX: 0.95, scaleZ: 1.55 } },
  { slug: "oval", name: "Ovale", family: "pierre", description: "Doux, généreux, intemporel.", program: { instructions: round, scaleX: 1, scaleZ: 1.45 } },
  { slug: "cushion", name: "Coussin", family: "pierre", description: "Vintage, facettes profondes.", program: { instructions: cushion, scaleX: 1, scaleZ: 1 } },
  { slug: "rose", name: "Taille rose", family: "pierre", description: "Facettes en dôme, signature DEBO.", program: { instructions: rose, scaleX: 1, scaleZ: 1 } },
];

/** Slug → GemCut (pour le rendu de repli R3F qui ne connaît que les 6 familles). */
export function slugToGemCut(slug: string): GemCut {
  const known: GemCut[] = ["round", "emerald", "pear", "oval", "cushion", "rose"];
  return (known as string[]).includes(slug) ? (slug as GemCut) : "round";
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function facetScale(repeat: number, mul: number): number {
  return Math.max(3, Math.min(32, Math.round(repeat * mul)));
}
function caratToViewScale(carats: number): number {
  const vs = (Math.cbrt(Math.max(0.05, carats)) / Math.cbrt(1.5)) * 0.95;
  return Math.min(1.3, Math.max(0.7, vs));
}
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
