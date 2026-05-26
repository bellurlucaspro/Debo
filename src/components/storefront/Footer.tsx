import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { NewsletterWidget } from "@/components/storefront/NewsletterWidget";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Créations",
    links: [
      { href: "/shop?category=perles-facettees", label: "Perles facettées" },
      { href: "/shop?category=pierres-precieuses", label: "Pierres précieuses" },
      { href: "/shop?category=pieces-disponibles", label: "Pièces disponibles" },
    ],
  },
  {
    title: "Sur-mesure",
    links: [
      { href: "/sur-mesure", label: "Configurer une perle" },
      { href: "/haute-joaillerie", label: "Haute joaillerie" },
      { href: "/account/orders", label: "Mes commandes" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-background">
      {/* Bandeau CTA */}
      <div className="section-shell border-b border-border py-16 md:py-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <h2
            className="font-serif font-light leading-[0.95] text-foreground"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            Une pièce en tête ?<br />
            <span className="italic text-primary">Composons-la ensemble.</span>
          </h2>
          <Link
            href="/sur-mesure"
            className="link-underline shrink-0 gap-3 text-[11px] uppercase tracking-luxe text-foreground"
          >
            Démarrer le sur-mesure
            <ArrowUpRight className="size-3.5" strokeWidth={1.4} />
          </Link>
        </div>
      </div>

      <div className="section-shell grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
        {/* Marque */}
        <div>
          <p className="font-serif text-3xl tracking-[0.25em]">DEBO</p>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Perles de culture facettées, pierres précieuses et haute joaillerie.
            Lumière, ombre et précision — façonnées à la main par Clarisse
            Debost.
          </p>
        </div>

        {/* Colonnes de liens */}
        {COLUMNS.map((col) => (
          <nav key={col.title} className="flex flex-col gap-3">
            <p className="eyebrow">{col.title}</p>
            {col.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ))}

        {/* Newsletter */}
        <NewsletterWidget />
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex flex-col items-center justify-between gap-4 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {year} DEBO. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="transition-colors hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/" className="transition-colors hover:text-foreground">
              Confidentialité
            </Link>
            <Link href="/" className="transition-colors hover:text-foreground">
              CGV
            </Link>
          </div>
        </div>
      </div>

      {/* Signature géante en filigrane */}
      <div
        aria-hidden
        className="overflow-hidden px-6 pb-2 pt-6 text-center leading-[0.8]"
      >
        <span className="select-none font-serif font-light tracking-[0.1em] text-foreground/[0.06] [font-size:clamp(4rem,22vw,20rem)]">
          DEBO
        </span>
      </div>
    </footer>
  );
}
