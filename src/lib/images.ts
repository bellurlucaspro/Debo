/**
 * Imagerie éditoriale DEBO — photos Pexels (licence libre) en hotlink CDN.
 * Toutes les URLs ont été vérifiées (HTTP 200, image/jpeg). Le domaine
 * `images.pexels.com` est autorisé dans next.config.ts.
 *
 * `px(id, w)` construit une URL optimisée (compression + largeur cible).
 * Centraliser ici évite de disperser des URLs magiques dans les composants.
 */
export function px(id: number, w = 1200): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}`;
}

/** Visuel héros / pièce mise en avant. */
export const HERO = {
  ring: px(10075092, 900), // bague joaillerie, écrin luxe
  pearls: px(6716445, 1400), // perles & or — atmosphère
};

/** Gemmes à découvrir (section sombre interactive). */
export const GEMS = [
  { name: "Perle facettée", img: px(6716445, 900) },
  { name: "Saphir", img: px(10361481, 900) }, // saphir / or fond noir
  { name: "Perle de Tahiti", img: px(36229131, 900) }, // perles sur nacre
  { name: "Rubis", img: px(13307186, 900) }, // gemmes rouges
  { name: "Émeraude", img: px(5442451, 900) }, // gemmes vertes
] as const;

/** Les quatre univers (cartes éditoriales). */
export const UNIVERSES = {
  perles: px(36229128, 1200), // perles sur satin
  pierres: px(13513581, 1200), // gemmes bleues étincelantes
  surMesure: px(31094159, 1200), // artisan / atelier
  hauteJoaillerie: px(30162861, 1200), // or & diamant sur velours
};

/**
 * Défilé horizontal "Vedettes" — gemmes/pièces sur fond blanc, présentées en
 * détouré via `mix-blend-mode: multiply` sur le beige (le blanc disparaît).
 */
export const SHOWCASE = [
  { name: "Saphir de Ceylan", type: "Pierre précieuse", price: "Sur demande", img: px(37702969, 1000), href: "/shop?category=pierres-precieuses" },
  { name: "Émeraude taillée", type: "Pierre précieuse", price: "Sur demande", img: px(32786083, 1000), href: "/shop?category=pierres-precieuses" },
  { name: "Diamant brillant", type: "Taille brillant", price: "Sur demande", img: px(4997548, 1000), href: "/shop" },
  { name: "Bague Halo", type: "Perle facettée", price: "2 400 €", img: px(750148, 1000), href: "/shop" },
  { name: "Solitaire Or", type: "Haute joaillerie", price: "Sur demande", img: px(12194367, 1000), href: "/haute-joaillerie" },
  { name: "Brillant Prisme", type: "Pierre taillée", price: "Sur demande", img: px(4997547, 1000), href: "/shop" },
] as const;

/** Savoir-faire / atelier (mains du lapidaire). */
export const ATELIER = {
  tweezers: px(7519289, 1100), // pince de précision
  bench: px(37250036, 1100), // établi, outils
  crafting: px(28221764, 1100), // façonnage délicat
  wide: px(31094159, 1600), // plan large atelier
};
