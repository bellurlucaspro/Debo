import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandMetal, BadgeCheck, Truck } from "lucide-react";

import { getProductBySlug } from "@/server/actions/products";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductPurchase } from "@/components/storefront/ProductPurchase";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Création introuvable" };
    return {
      title: product.name,
      description: product.description.slice(0, 155),
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 155),
        images: product.images[0] ? [{ url: product.images[0].url }] : [],
      },
    };
  } catch {
    return { title: "Création" };
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  let product: Awaited<ReturnType<typeof getProductBySlug>> = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    notFound();
  }
  if (!product) notFound();

  return (
    <article className="section-shell pb-28 pt-28 md:pt-36">
      {/* Fil d'Ariane */}
      <nav className="flex items-center gap-2 text-xs uppercase tracking-luxe text-muted-foreground">
        <Link href="/shop" className="transition-colors hover:text-foreground">
          Boutique
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              href={`/shop?category=${product.category.slug}`}
              className="transition-colors hover:text-foreground"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Galerie — collée en défilement sur desktop */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="lg:py-2">
          <ProductPurchase
            product={{
              name: product.name,
              basePrice: product.basePrice,
              currency: product.currency,
              category: product.category,
              variants: product.variants,
            }}
          />

          {/* Engagements */}
          <ul className="mt-10 grid grid-cols-3 gap-4 border-y border-border py-6">
            {[
              { icon: HandMetal, t: "Fait main" },
              { icon: BadgeCheck, t: "Certifié" },
              { icon: Truck, t: "Livré assuré" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex flex-col items-center gap-2 text-center">
                <Icon className="size-5 text-primary" strokeWidth={1.3} />
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  {t}
                </span>
              </li>
            ))}
          </ul>

          {/* Description */}
          <div className="mt-10">
            <p className="kicker">Le détail</p>
            <p className="mt-5 max-w-prose leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          {/* Réassurance signature */}
          <p className="mt-10 border-l-2 border-primary/40 pl-5 font-serif text-lg italic leading-relaxed text-foreground/80">
            « Chaque pièce est taillée une seule fois, pour une seule personne. »
            <span className="mt-2 block text-[11px] uppercase not-italic tracking-luxe text-muted-foreground">
              Clarisse Debost, lapidaire
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
