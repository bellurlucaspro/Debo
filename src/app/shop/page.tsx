import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getProducts, getCategories } from "@/server/actions/products";
import { ShopFilters } from "@/components/storefront/ShopFilters";
import { ProductCard, type ProductCardData } from "@/components/storefront/ProductCard";
import { Reveal } from "@/components/system/Reveal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Boutique",
  description:
    "Perles de culture facettées, pierres précieuses et pièces de joaillerie disponibles. Créations DEBO par Clarisse Debost.",
};

type SearchParams = Promise<{
  category?: string;
  search?: string;
  sort?: string;
  page?: string;
}>;

const EMPTY = {
  items: [] as ProductCardData[],
  total: 0,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  let data = EMPTY;
  let categories: { name: string; slug: string }[] = [];
  let dbError = false;

  try {
    [data, categories] = await Promise.all([
      getProducts({
        category: sp.category,
        search: sp.search,
        sort: sp.sort as never,
        page: sp.page ? Number(sp.page) : undefined,
      }) as Promise<typeof EMPTY>,
      getCategories(),
    ]);
  } catch {
    dbError = true;
  }

  // Construit une URL de pagination en conservant les filtres courants.
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (sp.category) params.set("category", sp.category);
    if (sp.search) params.set("search", sp.search);
    if (sp.sort) params.set("sort", sp.sort);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const activeName = categories.find((c) => c.slug === sp.category)?.name;

  return (
    <section className="section-shell pb-28 pt-28 md:pt-36">
      {/* En-tête éditorial */}
      <Reveal>
        <div className="grid gap-8 border-b border-border pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="kicker">
              La boutique{activeName ? ` — ${activeName}` : ""}
            </p>
            <h1
              className="mt-5 font-serif font-light leading-[0.95] text-foreground"
              style={{ fontSize: "clamp(2.75rem, 8vw, 6.5rem)" }}
            >
              {activeName ?? "Créations disponibles"}
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground md:text-right">
            Pièces uniques, taillées à la main et prêtes à être portées. Chacune
            est livrée avec son certificat d'authenticité.
          </p>
        </div>
      </Reveal>

      <div className="mt-8">
        <ShopFilters
          categories={categories}
          activeCategory={sp.category}
          activeSort={sp.sort}
          activeSearch={sp.search}
        />
      </div>

      {dbError ? (
        <div className="mt-16 hairline rounded-sm bg-card p-12 text-center text-muted-foreground">
          La base de données n'est pas encore connectée. Lancez{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
            prisma migrate
          </code>{" "}
          puis{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
            npm run db:seed
          </code>{" "}
          pour révéler le catalogue.
        </div>
      ) : data.items.length === 0 ? (
        <div className="mt-24 flex flex-col items-center gap-5 text-center">
          <span className="rule-dot" />
          <p className="font-serif text-2xl">Aucune création ne correspond.</p>
          <Link
            href="/shop"
            className="link-underline text-[11px] uppercase tracking-luxe text-foreground"
          >
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-8 text-xs uppercase tracking-luxe text-muted-foreground">
            {data.total} création{data.total > 1 ? "s" : ""}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-14 md:grid-cols-3 md:gap-x-8">
            {data.items.map((product, i) => (
              <Reveal key={product.slug} delay={(i % 3) * 0.06}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <nav className="mt-20 flex items-center justify-center gap-2">
              {data.page > 1 && (
                <Link
                  href={pageHref(data.page - 1)}
                  scroll
                  aria-label="Page précédente"
                  className="grid size-10 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" strokeWidth={1.5} />
                </Link>
              )}
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={pageHref(p)}
                    scroll
                    className={cn(
                      "grid size-10 place-items-center rounded-sm border text-sm tabular-nums transition-colors",
                      p === data.page
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                  >
                    {p}
                  </Link>
                )
              )}
              {data.page < data.totalPages && (
                <Link
                  href={pageHref(data.page + 1)}
                  scroll
                  aria-label="Page suivante"
                  className="grid size-10 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  <ArrowRight className="size-4" strokeWidth={1.5} />
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
