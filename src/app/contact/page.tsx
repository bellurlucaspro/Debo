import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

import { LineReveal } from "@/components/system/LineReveal";
import { Reveal } from "@/components/system/Reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Clarisse Debost, lapidaire — conseil, devis gratuit et accompagnement personnalisé pour perles facettées, pierres précieuses et haute joaillerie.",
};

const COORDS = [
  { icon: Mail, label: "E-mail", value: "contact@debo.fr", href: "mailto:contact@debo.fr" },
  { icon: Phone, label: "Téléphone", value: "+33 (0)4 73 00 00 00", href: "tel:+33473000000" },
  { icon: MapPin, label: "Atelier", value: "Puy-de-Dôme, Auvergne", href: null },
];

export default function ContactPage() {
  return (
    <section className="section-shell pb-28 pt-28 md:pt-36">
      <Reveal>
        <p className="kicker">Contact</p>
      </Reveal>
      <LineReveal
        as="h1"
        className="mt-5 font-serif font-light leading-[0.95] text-foreground"
        style={{ fontSize: "clamp(2.75rem, 8vw, 6rem)" }}
        lines={[
          "Prenons",
          <span key="2" className="italic text-primary">
            rendez-vous.
          </span>,
        ]}
      />

      <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
            Un projet, une pierre en tête, une question ? Clarisse Debost vous
            répond personnellement —{" "}
            <span className="font-medium text-foreground">
              un seul interlocuteur
            </span>
            , du conseil au certificat.
          </p>
          <Button size="lg" asChild className="mt-8">
            <Link href="mailto:contact@debo.fr">
              Écrire un e-mail
              <ArrowRight className="size-4" strokeWidth={1.6} />
            </Link>
          </Button>
        </Reveal>

        <ul className="border-t border-border">
          {COORDS.map(({ icon: Icon, label, value, href }, i) => (
            <Reveal key={label} delay={i * 0.08}>
              <li className="flex items-center gap-5 border-b border-border py-6">
                <Icon className="size-5 text-primary" strokeWidth={1.4} />
                <div>
                  <p className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="link-underline font-serif text-xl text-foreground"
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="font-serif text-xl text-foreground">{value}</p>
                  )}
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
