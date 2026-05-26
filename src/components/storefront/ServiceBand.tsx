import { HandMetal, BadgeCheck, Gem, Truck } from "lucide-react";

import { Reveal } from "@/components/system/Reveal";

const SERVICES = [
  { icon: HandMetal, t: "Fait main", d: "Taillé à la main en atelier" },
  { icon: BadgeCheck, t: "Certifié", d: "Certificat d'authenticité fourni" },
  { icon: Gem, t: "Sur-mesure", d: "Composez votre pièce unique" },
  { icon: Truck, t: "Livraison assurée", d: "Expédition sécurisée & suivie" },
];

/**
 * Bandeau de réassurance — quatre piliers de la maison, séparés par des
 * filets, sur fond crème éclairci. Ancre la confiance avant le pied de page.
 */
export function ServiceBand() {
  return (
    <section className="bleed py-6 md:py-8">
      <div className="overflow-hidden bg-secondary text-secondary-foreground">
        <div className="grid grid-cols-2 divide-x divide-y divide-foreground/10 md:grid-cols-4 md:divide-y-0">
          {SERVICES.map(({ icon: Icon, t, d }, i) => (
            <Reveal key={t} delay={(i % 4) * 0.06}>
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center md:py-16">
                <Icon className="size-6 text-foreground" strokeWidth={1.3} />
                <p className="font-serif text-lg leading-none">{t}</p>
                <p className="text-xs leading-relaxed text-foreground/70">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
