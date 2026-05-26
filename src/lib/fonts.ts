import { Cormorant, Inter } from "next/font/google";

/**
 * Typographie DEBO.
 * - Cormorant : serif display fin et très élégant à fort contraste (titres
 *   géants façon haute joaillerie). Italique pour les accents.
 * - Inter : grotesque neutre pour l'UI et les corps de texte.
 *
 * Exposées en variables CSS, consommées par tailwind.config.ts
 * (`font-serif` / `font-sans`).
 */
export const fontSerif = Cormorant({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
