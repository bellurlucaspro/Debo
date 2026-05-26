/**
 * Gem Studio — Catalogue de textures / apparences.
 *
 * Liste de référence (menu déroulant admin) de toutes les apparences possibles
 * pour les pierres précieuses et les perles de culture. Chaque apparence porte :
 *   - sa teinte d'affichage (pastille + repli),
 *   - ses propriétés optiques (pour le ray-tracer des pierres ; la densité sert
 *     à l'estimation carats des deux familles).
 *
 * L'admin choisit une apparence pour chaque matière (pierre/perle) ; le front en
 * dérive le rendu 3D.
 */

import type { OpticalProperties } from "./design";

export interface Appearance {
  id: string;
  label: string;
  kind: "pierre" | "perle";
  colorHex: string;
  optics: OpticalProperties;
}

const stone = (
  id: string,
  label: string,
  colorHex: string,
  ior: number,
  dispersion: number,
  absorption: [number, number, number],
  density: number,
): Appearance => ({ id, label, kind: "pierre", colorHex, optics: { ior, dispersion, absorption, density } });

const pearl = (id: string, label: string, colorHex: string): Appearance => ({
  id,
  label,
  kind: "perle",
  colorHex,
  optics: { ior: 1.53, dispersion: 0, absorption: [0.3, 0.3, 0.35], density: 2.7 },
});

/* ── Pierres précieuses ───────────────────────────────────────────────────── */
const STONE_APPEARANCES: Appearance[] = [
  stone("diamant-blanc", "Diamant blanc", "#EAF0F4", 2.418, 0.044, [0.02, 0.02, 0.02], 3.52),
  stone("saphir-bleu", "Saphir bleu", "#2E4E9B", 1.77, 0.018, [1.6, 0.9, 0.12], 4.0),
  stone("saphir-rose", "Saphir rose", "#D17AA8", 1.77, 0.018, [0.15, 1.1, 0.9], 4.0),
  stone("saphir-jaune", "Saphir jaune", "#E8C24A", 1.77, 0.018, [0.1, 0.35, 1.5], 4.0),
  stone("rubis", "Rubis", "#8A1F2D", 1.77, 0.018, [0.1, 1.4, 1.7], 4.0),
  stone("emeraude", "Émeraude", "#1F8158", 1.58, 0.014, [1.2, 0.15, 0.9], 2.76),
  stone("aigue-marine", "Aigue-marine", "#7FC6D9", 1.58, 0.014, [0.9, 0.4, 0.1], 2.7),
  stone("tanzanite", "Tanzanite", "#5A50A6", 1.69, 0.03, [0.8, 0.7, 0.2], 3.35),
  stone("amethyste", "Améthyste", "#7B4EA0", 1.54, 0.013, [0.5, 0.8, 0.25], 2.65),
  stone("topaze-imperiale", "Topaze impériale", "#D98E4E", 1.62, 0.014, [0.15, 0.5, 1.1], 3.55),
  stone("citrine", "Citrine", "#E0A33A", 1.55, 0.013, [0.1, 0.35, 1.2], 2.65),
  stone("grenat", "Grenat", "#7A1B22", 1.79, 0.027, [0.15, 1.3, 1.5], 3.9),
  stone("peridot", "Péridot", "#9BC24A", 1.65, 0.02, [0.9, 0.2, 1.0], 3.34),
  stone("morganite", "Morganite", "#E5B6B0", 1.58, 0.014, [0.2, 0.5, 0.6], 2.8),
  stone("diamant-noir", "Diamant noir", "#2A2A2A", 2.418, 0.044, [3.0, 3.0, 3.0], 3.52),
];

/* ── Perles de culture ────────────────────────────────────────────────────── */
const PEARL_APPEARANCES: Appearance[] = [
  pearl("perle-blanche", "Perle blanche", "#F1EADD"),
  pearl("perle-tahiti", "Perle de Tahiti", "#3B3A3A"),
  pearl("perle-paon", "Perle paon", "#2E3B3A"),
  pearl("perle-doree", "Perle dorée", "#E6C684"),
  pearl("perle-peche", "Perle pêche", "#E9B9A3"),
  pearl("perle-lavande", "Perle lavande", "#C9B8D6"),
  pearl("perle-gris-argent", "Perle gris argent", "#B9BBBE"),
  pearl("perle-chocolat", "Perle chocolat", "#6B4A36"),
  pearl("perle-aubergine", "Perle aubergine", "#4A2E3B"),
];

export const APPEARANCES: Appearance[] = [...STONE_APPEARANCES, ...PEARL_APPEARANCES];

const BY_ID = new Map(APPEARANCES.map((a) => [a.id, a]));

export function getAppearance(id: string): Appearance | undefined {
  return BY_ID.get(id);
}

/** Apparences proposées pour une famille donnée (menu déroulant admin). */
export function appearancesFor(kind: "pierre" | "perle"): Appearance[] {
  return APPEARANCES.filter((a) => a.kind === kind);
}
