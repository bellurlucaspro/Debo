import type { Metadata } from "next";

import { LineReveal } from "@/components/system/LineReveal";
import { Reveal } from "@/components/system/Reveal";
import { Configurator } from "@/components/storefront/Configurator";
import { listStorefront } from "@/server/actions/materials";

export const metadata: Metadata = {
  title: "Sur-mesure",
  description:
    "Composez 100 % de votre bijou : pierre brute, diagramme de taille, monture, matière, carats. Demande de devis avec gouachés — Clarisse Debost, lapidaire.",
};

export default async function SurMesurePage() {
  const { materials, diagrams } = await listStorefront();
  return (
    <section className="section-shell pb-28 pt-28 md:pt-36">
      <Reveal>
        <p className="kicker">Sur-mesure · Configurateur</p>
      </Reveal>
      <LineReveal
        as="h1"
        className="mt-5 font-serif font-light leading-[0.95] text-foreground"
        style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}
        lines={[
          "Créez votre",
          <span key="2" className="italic text-primary">
            pièce unique.
          </span>,
        ]}
      />
      <Reveal>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          De la pierre brute à la lumière : choisissez la gemme, sa taille, sa
          monture et sa matière. Ajoutez vos inspirations — Clarisse vous
          recontacte avec un devis et des gouachés.
        </p>
      </Reveal>

      <div className="mt-14">
        <Configurator materials={materials} diagrams={diagrams} />
      </div>
    </section>
  );
}
