import { Hero } from "@/components/storefront/Hero";
import { FeaturedShowcase } from "@/components/storefront/FeaturedShowcase";
import { Manifesto } from "@/components/storefront/Manifesto";
import { Atelier } from "@/components/storefront/Atelier";
import { Destinations } from "@/components/storefront/Destinations";
import { ServiceBand } from "@/components/storefront/ServiceBand";

/**
 * Page d'accueil DEBO — blocs container (palette DA), forte hiérarchie.
 * Hero large → défilé horizontal des vedettes → manifeste (bloc Brownie sombre)
 * → savoir-faire → destinations (accès pages clés) → réassurance.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedShowcase />
      <Manifesto />
      <Atelier />
      <Destinations />
      <ServiceBand />
    </>
  );
}
