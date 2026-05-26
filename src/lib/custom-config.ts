/**
 * Données (statiques, V1) du configurateur sur-mesure.
 * Catalogue de pierres/perles brutes, diagrammes de taille, montures, matières,
 * carats et occasions. À terme, le catalogue brut viendra de la base.
 */

export type GemCut = "round" | "emerald" | "pear" | "oval" | "cushion" | "rose";

export type RawStone = {
  id: string;
  name: string;
  family: "perle" | "pierre";
  /** Couleur dominante (hex) — pilote l'aperçu 3D et la pastille. */
  color: string;
  blurb: string;
};

export const STONES: RawStone[] = [
  // Perles de culture (brutes, à facetter)
  { id: "perle-blanche", name: "Perle de culture blanche", family: "perle", color: "#F1EADD", blurb: "Nacre crémeuse, reflets dorés." },
  { id: "perle-tahiti", name: "Perle de Tahiti", family: "perle", color: "#3B3A3A", blurb: "Noir profond aux reflets paon." },
  { id: "perle-doree", name: "Perle dorée des Philippines", family: "perle", color: "#E6C684", blurb: "Or chaud, lumière du soir." },
  { id: "perle-peche", name: "Perle pêche", family: "perle", color: "#E9B9A3", blurb: "Rosé tendre, nacre vivante." },
  // Pierres précieuses (brutes, à tailler)
  { id: "saphir", name: "Saphir", family: "pierre", color: "#2E4E9B", blurb: "Bleu velours, feu discret." },
  { id: "emeraude", name: "Émeraude", family: "pierre", color: "#1F8158", blurb: "Vert jardin, jardin intérieur." },
  { id: "rubis", name: "Rubis", family: "pierre", color: "#8A1F2D", blurb: "Rouge sang de pigeon." },
  { id: "tanzanite", name: "Tanzanite", family: "pierre", color: "#5A50A6", blurb: "Bleu-violet trichroïque." },
  { id: "amethyste", name: "Améthyste", family: "pierre", color: "#7B4EA0", blurb: "Violet profond et lumineux." },
  { id: "topaze", name: "Topaze impériale", family: "pierre", color: "#D98E4E", blurb: "Ambre doré, chaleur rare." },
];

export const CUTS: { id: GemCut; name: string; desc: string }[] = [
  { id: "round", name: "Brillant rond", desc: "Le maximum de feu et d'éclat." },
  { id: "emerald", name: "Taille émeraude", desc: "Lignes nettes, élégance Art déco." },
  { id: "pear", name: "Poire", desc: "Goutte gracieuse, allonge le doigt." },
  { id: "oval", name: "Ovale", desc: "Doux, généreux, intemporel." },
  { id: "cushion", name: "Coussin", desc: "Vintage, facettes profondes." },
  { id: "rose", name: "Taille rose", desc: "Facettes en dôme, signature DEBO." },
];

export const MOUNTINGS = [
  { id: "aucune", name: "Pierre seule", desc: "Taillée et certifiée, sans monture." },
  { id: "bague", name: "Bague", desc: "Solitaire, halo ou jonc." },
  { id: "collier", name: "Collier / pendentif", desc: "Chaîne et serti sur-mesure." },
  { id: "boucles", name: "Boucles d'oreilles", desc: "Puces, dormeuses ou pendantes." },
  { id: "bracelet", name: "Bracelet", desc: "Jonc, chaîne ou manchette." },
] as const;

export type MountingId = (typeof MOUNTINGS)[number]["id"];

export const MATERIALS = [
  { id: "or-jaune", name: "Or jaune", swatch: "#C9A24B" },
  { id: "or-blanc", name: "Or blanc", swatch: "#D8D9DC" },
  { id: "or-rose", name: "Or rose", swatch: "#D9A38C" },
  { id: "argent", name: "Argent", swatch: "#B9BBBE" },
  { id: "platine", name: "Platine", swatch: "#A9ABAE" },
] as const;

export type MaterialId = (typeof MATERIALS)[number]["id"];

/** Carats — pertinents pour l'or (l'argent/platine n'en utilisent pas). */
export const CARATS = ["9 ct", "14 ct", "18 ct", "24 ct"];

export const OCCASIONS = [
  "Fiançailles",
  "Mariage",
  "Anniversaire",
  "Naissance",
  "Cadeau",
  "Pour soi",
  "Autre",
];
