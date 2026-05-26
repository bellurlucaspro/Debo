/**
 * Gem Studio — Fiche technique (« spec ») d'une pierre configurée.
 *
 * Traduit un `GemDesign` (le résultat des réglages grand public) en données
 * LAPIDAIRES exploitables par Clarisse : dimensions mm, angles, % de table,
 * comptes de facettes, allongement, et le PROGRAMME DE FACETTAGE complet
 * (la liste ordonnée angle/index/profondeur — ce qu'on entre sur la machine).
 *
 * Pur (aucune dépendance React). Sérialisable → stocké en base (`spec Json`),
 * envoyé dans l'e-mail de devis, et affiché dans l'admin.
 */

import { estimateCarats, type GemDesign } from "./design";

const DEG = Math.PI / 180;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface FacetingRow {
  tier: string;
  /** Angle en degrés (couronne/pavillon ; 90 = table). */
  angleDeg: number;
  /** Cran d'index sur la roue (azimut). */
  index: number;
  /** Profondeur/offset relatif (table, rondiste, culet). */
  depthRel: number;
  /** Nombre de facettes de cette rangée. */
  repeat: number;
}

export interface GemSpec {
  /** Libellés affichables (viennent de l'UI). */
  speciesLabel: string;
  cutLabel: string;
  styleLabel: string;

  /** Mesures principales. */
  caratWeight: number;
  diameterMm: number; // largeur du rondiste (axe court)
  lengthMm: number; // longueur (axe long, ovale/poire/émeraude)
  depthMm: number; // hauteur totale
  tablePercent: number | null; // largeur de table en % du diamètre
  crownAngleDeg: number | null;
  pavilionAngleDeg: number | null;
  mainFacets: number; // facettes principales (couronne)
  girdleFacets: number; // côtés du rondiste
  hasCulet: boolean;
  elongation: number; // longueur / largeur (1 = rond)

  /** Couleur / optique. */
  colorIntensityPct: number; // saturation relative (absorption vs référence)
  refractiveIndex: number;
  dispersion: number;

  /** Programme de facettage complet (machine). */
  facetingProgram: FacetingRow[];

  /** Récapitulatif lisible (1 ligne par mesure clé). */
  summaryLines: string[];
}

export function buildGemSpec(
  design: GemDesign,
  labels: { speciesLabel: string; cutLabel: string; styleLabel: string },
): GemSpec {
  const instr = design.instructions;
  const table = instr.find((i) => i.tier === "table");
  const crown = instr.find((i) => i.tier === "crown");
  const pavilion = instr.find((i) => i.tier === "pavilion");
  const girdle = instr.find((i) => i.tier === "girdle");
  const culet = instr.find((i) => i.tier === "culet");

  const diameterMm = design.girdleDiameterMm;
  const elongation = design.silhouette
    ? r2(design.silhouette.scaleZ / design.silhouette.scaleX)
    : 1;
  const lengthMm = r2(diameterMm * elongation);

  // % de table : rayon du méplat = 1 − tan(angle couronne)·hauteur de table.
  let tablePercent: number | null = null;
  if (table && crown) {
    const r = 1 - Math.tan(crown.angle * DEG) * table.depth;
    tablePercent = Math.round(Math.max(0, Math.min(1, r)) * 100);
  }

  // Intensité couleur : absorption courante vs référence de l'espèce (≈ ×1).
  // On l'estime via la moyenne des canaux normalisée sur la plage 0.45–1.9.
  const meanAbs = (design.optics.absorption[0] + design.optics.absorption[1] + design.optics.absorption[2]) / 3;

  const caratWeight = r2(estimateCarats(design));

  const facetingProgram: FacetingRow[] = instr.map((i) => ({
    tier: i.tier,
    angleDeg: r1(i.angle),
    index: i.index,
    depthRel: r2(i.depth),
    repeat: i.repeat,
  }));

  const summaryLines = [
    `${labels.speciesLabel} · taille ${labels.cutLabel} · allure ${labels.styleLabel}`,
    `Poids estimé : ${caratWeight} ct`,
    `Dimensions : ${r2(lengthMm)} × ${r2(diameterMm)} × ${r2(design.totalDepthMm)} mm (L×l×P)`,
    tablePercent != null ? `Table : ${tablePercent} %` : `Table : —`,
    crown ? `Angle de couronne : ${r1(crown.angle)}°` : `Couronne : —`,
    pavilion ? `Angle de pavillon : ${r1(pavilion.angle)}°` : `Pavillon : —`,
    `Facettes principales : ${crown?.repeat ?? 0} · rondiste : ${girdle?.repeat ?? 0} côtés`,
    culet ? (culet.depth <= 0.05 ? `Culet : fond plat` : `Culet : pointe`) : `Culet : —`,
    `Indice de réfraction : ${design.optics.ior} · dispersion : ${design.optics.dispersion}`,
  ];

  return {
    speciesLabel: labels.speciesLabel,
    cutLabel: labels.cutLabel,
    styleLabel: labels.styleLabel,
    caratWeight,
    diameterMm: r2(diameterMm),
    lengthMm: r2(lengthMm),
    depthMm: r2(design.totalDepthMm),
    tablePercent,
    crownAngleDeg: crown ? r1(crown.angle) : null,
    pavilionAngleDeg: pavilion ? r1(pavilion.angle) : null,
    mainFacets: crown?.repeat ?? 0,
    girdleFacets: girdle?.repeat ?? 0,
    hasCulet: !!culet && culet.depth > 0.05,
    elongation,
    colorIntensityPct: Math.round(Math.max(0, Math.min(1, (meanAbs / 1.0) * 0.6)) * 100),
    refractiveIndex: design.optics.ior,
    dispersion: design.optics.dispersion,
    facetingProgram,
    summaryLines,
  };
}
