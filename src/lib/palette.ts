/** Correspondance nom de teinte DEBO → couleur hex (pastilles de variantes). */
export const PALETTE_HEX: Record<string, string> = {
  obsidian: "#000000",
  midnight: "#090F15",
  granite: "#221C19",
  cacao: "#342B27",
  leather: "#5E4B14",
  taupe: "#8E8178",
  beige: "#C8B7A6",
  nude: "#EDB8CC",
  pearl: "#F4EEE6",
  ivory: "#F3F9D2",
  "off-white": "#F8F8F8",
  white: "#FFFFFF",
};

/** Renvoie le hex d'une teinte (repli beige si inconnue). */
export function colorHex(name: string): string {
  return PALETTE_HEX[name.trim().toLowerCase()] ?? "#C8B7A6";
}
