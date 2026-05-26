import Link from "next/link";

import { getFeaturedProducts } from "@/server/actions/products";
import { ProductCard, type ProductCardData } from "@/components/storefront/ProductCard";
import { Reveal } from "@/components/system/Reveal";
import { Button } from "@/components/ui/button";

/**
 * Sélection de créations vedettes (Server Component).
 * Résilient : si la base n'est pas accessible (ex. aperçu sans Postgres), on
 * retombe sur un état élégant plutôt qu'une erreur 500.
 */
export async function FeaturedProducts() {
  let products: ProductCardData[] = [];
  try {
    products = await getFeaturedProducts(6);
  } catch {
    products = [];
  }

  return (
    <section className="section-shell py-10 md:py-16">
      <div className="panel px-6 py-14 md:px-14 md:py-20">
      <Reveal>
        <div className="flex items-end justify-between gap-6 border-b border-border pb-8">
          <div>
            <p className="kicker">Sélection</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
              Créations vedettes
            </h2>
          </div>
          <Link
            href="/shop"
            className="link-underline mb-2 hidden shrink-0 gap-2 text-[11px] uppercase tracking-luxe text-foreground md:inline-flex"
          >
            Tout voir
          </Link>
        </div>
      </Reveal>

      {products.length === 0 ? (
        <Reveal className="mt-12 rounded-sm border border-border bg-background p-12 text-center">
          <p className="mx-auto max-w-md text-muted-foreground">
            Le catalogue se dévoile très bientôt. Connectez la base de données
            et lancez le seed pour révéler les premières pièces.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-6">
            <Link href="/shop">Voir la boutique</Link>
          </Button>
        </Reveal>
      ) : (
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3">
          {products.map((product, i) => (
            <Reveal key={product.slug} delay={(i % 3) * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      )}

      <Reveal className="mt-16 flex justify-center">
        <Button variant="link" asChild className="text-base">
          <Link href="/shop">Découvrir toutes les créations →</Link>
        </Button>
      </Reveal>
      </div>
    </section>
  );
}
