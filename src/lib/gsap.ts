"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";

/**
 * Point d'entrée GSAP unique pour DEBO.
 * - Enregistre les plugins (gratuits depuis GSAP 3.13) une seule fois côté client.
 * - Déclare les eases "organiques" signature de la marque (CustomEase).
 *
 * Importer ce module suffit : `import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap"`.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText, CustomEase);

  // Eases maison. CustomEase.create est idempotent (réenregistrer une courbe
  // du même nom la remplace sans erreur), donc pas besoin de garde.
  // Décélération douce, "galerie d'art".
  CustomEase.create("debo-soft", "M0,0 C0.16,1 0.3,1 1,1");
  // Zoom progressif organique.
  CustomEase.create("debo-organic", "M0,0 C0.65,0.05 0.1,1 1,1");
  // Rebond haut de gamme (panier tiroir) — léger overshoot maîtrisé.
  CustomEase.create(
    "debo-bounce",
    "M0,0 C0.22,1 0.36,1.06 0.54,1.02 0.74,0.98 0.86,1 1,1"
  );

  // Le rafraîchissement ScrollTrigger après chargement des polices/images.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, useGSAP, ScrollTrigger, Flip, SplitText, CustomEase };
