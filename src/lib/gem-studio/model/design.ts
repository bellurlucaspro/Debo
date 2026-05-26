/**
 * Gem Studio — Modèle de données immuable de la pierre.
 *
 * Principe fondateur : une gemme taillée est un POLYÈDRE CONVEXE, donc
 * l'intersection d'un ensemble de demi-espaces (plans). On ne stocke JAMAIS
 * un maillage triangulé comme source de vérité — on stocke les *instructions
 * de taille* (triplets angle/index/hauteur), exactement comme une machine à
 * facetter physique. Le maillage et les plans sont des artefacts *dérivés*,
 * recompilés par le worker. Cela garantit :
 *   - un état minimal, sérialisable, diffable, versionné (`revision`) ;
 *   - une compilation GPU-friendly (N plans, pas de BVH) ;
 *   - une réversibilité parfaite (on peut « dé-tailler »).
 *
 * Toutes les structures sont `readonly` profondes : aucune mutation en place
 * côté UI. Les mutations passent par des reducers purs (voir `mutate.ts`) qui
 * renvoient un nouvel objet — le worker, lui, travaille sur des ArrayBuffers
 * mutables (cf. `compile.ts`) pour zéro GC pendant le drag des sliders.
 */

/** Espèces supportées — pilote le preset optique par défaut. */
export type GemSpecies =
  | "diamond"
  | "sapphire"
  | "ruby"
  | "emerald"
  | "tanzanite"
  | "amethyst"
  | "topaz"
  | "pearl"; // perle = cas opaque/nacré, rendu par un chemin séparé

/** Étage de taille auquel appartient une facette. */
export type FacetTier = "table" | "crown" | "girdle" | "pavilion" | "culet";

/**
 * Propriétés optiques mesurées (physiques, pas artistiques).
 * `ior` est l'indice à la raie D du sodium (~589 nm).
 * `dispersion` est le delta d'indice entre les extrêmes du visible
 * (n_F − n_C, ~0.044 pour le diamant) : c'est lui qui crée le « feu ».
 * `absorption` est le coefficient de Beer–Lambert par canal (R,V,B), en mm⁻¹ :
 * c'est lui qui donne la couleur et la profondeur (saphir bleu = forte
 * absorption R/V, faible B).
 */
export interface OpticalProperties {
  readonly ior: number;
  readonly dispersion: number;
  readonly absorption: readonly [number, number, number];
  /** g/cm³ — sert à l'estimation du poids en carats. */
  readonly density: number;
}

/**
 * Une instruction de taille = un triplet de la machine à facetter.
 *  - `angle`  : élévation du mât en degrés (0° = équatorial/rondiste,
 *               90° = pôle/table). Définit l'inclinaison de la facette.
 *  - `index`  : cran de la roue d'index (entier). L'azimut = index / gear · 360°.
 *  - `depth`  : profondeur de coupe relative (« cheater » + avance), normalisée.
 *               Pilote l'offset `d` du plan : plus profond = plan plus proche
 *               du centre = facette plus grande.
 */
export interface FacetInstruction {
  readonly tier: FacetTier;
  readonly angle: number;
  readonly index: number;
  readonly depth: number;
  /** Symétrie : nb de répétitions autour de l'axe (ex. 8 → octogonal). */
  readonly repeat: number;
  /**
   * Azimuts EXPLICITES (crans d'index réels, ex. import GemCAD). Si présent,
   * une facette est créée à chaque cran listé (azimut = index/gear·360°), ce qui
   * gère les motifs irréguliers (facettes en paires). Sinon, `repeat` facettes
   * sont réparties régulièrement à partir de `index`.
   */
  readonly indices?: number[];
}

/**
 * État source complet de la pierre. Immuable. Sérialisable tel quel
 * (postMessage / persistance Supabase / partage d'URL).
 */
export interface GemDesign {
  readonly id: string;
  /** Métadonnée indicative ; le rendu n'utilise que `optics`. */
  readonly species?: GemSpecies;
  readonly optics: OpticalProperties;

  /** Dimensions globales en millimètres (échelle réelle → estimation carats). */
  readonly girdleDiameterMm: number;
  readonly totalDepthMm: number;

  /** Denture de la roue d'index (96 et 64 sont les standards lapidaires). */
  readonly indexGear: number;

  /**
   * Silhouette (allongement non-uniforme du contour) : ovale, poire, émeraude.
   * scaleX/scaleZ = 1 → contour circulaire. Appliqué aux plans à la compilation.
   */
  readonly silhouette?: { readonly scaleX: number; readonly scaleZ: number };

  /**
   * Échelle visuelle de la pierre dans le cadre (feedback du curseur « Taille »).
   * 1 = référence. Multiplie l'offset de tous les plans → la gemme grossit/réduit
   * à l'écran sans toucher la caméra.
   */
  readonly viewScale?: number;

  /** Le programme de taille, ordonné (table → couronne → rondiste → pavillon). */
  readonly instructions: readonly FacetInstruction[];

  /**
   * Compteur monotone incrémenté à chaque mutation. Sert de clé de cache :
   * le worker ne recompile que si `revision` a changé.
   */
  readonly revision: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Presets optiques (valeurs gemmologiques réelles).
 * ────────────────────────────────────────────────────────────────────────── */

export const OPTICS: Record<GemSpecies, OpticalProperties> = {
  diamond: { ior: 2.418, dispersion: 0.044, absorption: [0.02, 0.02, 0.02], density: 3.52 },
  sapphire: { ior: 1.77, dispersion: 0.018, absorption: [1.6, 0.9, 0.12], density: 4.0 },
  ruby: { ior: 1.77, dispersion: 0.018, absorption: [0.1, 1.4, 1.7], density: 4.0 },
  emerald: { ior: 1.58, dispersion: 0.014, absorption: [1.2, 0.15, 0.9], density: 2.76 },
  tanzanite: { ior: 1.69, dispersion: 0.03, absorption: [0.8, 0.7, 0.2], density: 3.35 },
  amethyst: { ior: 1.54, dispersion: 0.013, absorption: [0.5, 0.8, 0.25], density: 2.65 },
  topaz: { ior: 1.62, dispersion: 0.014, absorption: [0.15, 0.5, 1.1], density: 3.55 },
  pearl: { ior: 1.53, dispersion: 0.0, absorption: [0.3, 0.3, 0.35], density: 2.7 },
};

/* ──────────────────────────────────────────────────────────────────────────
 * Fabrique d'état + estimation carats.
 * ────────────────────────────────────────────────────────────────────────── */

/** Crée un design vierge (un brillant rond standard est un bon point de départ). */
export function createGemDesign(species: GemSpecies, id = crypto.randomUUID()): GemDesign {
  return {
    id,
    species,
    optics: OPTICS[species],
    girdleDiameterMm: 6.5,
    totalDepthMm: 4.0,
    indexGear: 96,
    instructions: STANDARD_ROUND_BRILLIANT,
    revision: 0,
  };
}

/**
 * Estimation du poids (carats). Approxime le volume du polyèdre par le facteur
 * de forme du brillant rond (≈ π/6 · diamètre² · profondeur · 0.0018 ajusté),
 * pondéré par la densité. Le volume EXACT vient du worker (somme des tétraèdres
 * du maillage) ; ceci est l'estimation instantanée côté UI.
 */
export function estimateCarats(d: GemDesign): number {
  const dia = d.girdleDiameterMm;
  const depth = d.totalDepthMm;
  const volumeMm3 = 0.0061 * dia * dia * depth * 100; // facteur de forme brillant
  const grams = (volumeMm3 / 1000) * d.optics.density;
  return grams / 0.2; // 1 carat = 0.2 g
}

/**
 * Inverse de `estimateCarats` : pour un poids cible (carats) et une densité,
 * renvoie les dimensions (diamètre + profondeur ≈ 0.61·diamètre).
 */
export function caratsToDimensions(
  carats: number,
  density: number,
): { girdleDiameterMm: number; totalDepthMm: number } {
  // carats ≈ 0.00186 · densité · diamètre³  (profondeur = 0.61·diamètre)
  const k = 0.00186 * density;
  const dia = Math.cbrt(Math.max(0.01, carats) / k);
  return { girdleDiameterMm: dia, totalDepthMm: dia * 0.61 };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Programme de référence : le brillant rond « Tolkowsky ».
 * Angles couronne ≈ 34.5°, pavillon ≈ 40.75°. 8 facettes principales + étoiles.
 * ────────────────────────────────────────────────────────────────────────── */

const STANDARD_ROUND_BRILLIANT: readonly FacetInstruction[] = [
  { tier: "table", angle: 90, index: 0, depth: 0.43, repeat: 1 },
  { tier: "crown", angle: 34.5, index: 0, depth: 0.7, repeat: 8 }, // bezels
  { tier: "crown", angle: 41.0, index: 4, depth: 0.78, repeat: 8 }, // upper girdle
  { tier: "girdle", angle: 0, index: 0, depth: 1.0, repeat: 16 },
  { tier: "pavilion", angle: 40.75, index: 0, depth: 0.72, repeat: 8 }, // mains
  { tier: "pavilion", angle: 42.0, index: 4, depth: 0.8, repeat: 8 }, // lower girdle
  { tier: "culet", angle: 0, index: 0, depth: 0.02, repeat: 1 },
];
