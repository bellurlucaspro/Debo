import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { productFilterSchema, type ProductFilter } from "@/schemas/product";

/**
 * Read-only catalog data access. These are plain async functions consumed by
 * React Server Components. `cache()` dedupes identical calls within a single
 * request render pass.
 */

const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  currency: true,
  isFeatured: true,
  images: {
    orderBy: { position: "asc" },
    take: 2,
    select: { url: true, alt: true },
  },
  variants: {
    where: { isActive: true },
    select: { id: true, color: true, size: true, price: true, inventory: true },
  },
} satisfies Prisma.ProductSelect;

function buildOrderBy(
  sort: ProductFilter["sort"]
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { basePrice: "asc" };
    case "price-desc":
      return { basePrice: "desc" };
    case "name-asc":
      return { name: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function getProducts(rawFilter: Partial<ProductFilter> = {}) {
  const filter = productFilterSchema.parse(rawFilter);

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(filter.featuredOnly ? { isFeatured: true } : {}),
    ...(filter.category ? { category: { slug: filter.category } } : {}),
    ...(filter.search
      ? {
          OR: [
            { name: { contains: filter.search, mode: "insensitive" } },
            { description: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
      ? {
          basePrice: {
            ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
            ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: PRODUCT_LIST_SELECT,
      orderBy: buildOrderBy(filter.sort),
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page: filter.page,
    pageSize: filter.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filter.pageSize)),
  };
}

/** Full product detail for the PDP, including all images and variants. */
export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { position: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: [{ color: "asc" }, { size: "asc" }],
      },
    },
  });
});

/** Featured products for the homepage hero/grid. */
export const getFeaturedProducts = cache(async (take = 6) => {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: PRODUCT_LIST_SELECT,
    orderBy: { createdAt: "desc" },
    take,
  });
});

/** Active categories for navigation and filters. */
export const getCategories = cache(async () => {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, parentId: true },
  });
});

/** Slugs for static generation (generateStaticParams on the PDP). */
export async function getAllProductSlugs() {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
