import { z } from "zod";

/** Catalog query + admin mutation schemas. */

export const productSortSchema = z.enum([
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
]);
export type ProductSort = z.infer<typeof productSortSchema>;

export const productFilterSchema = z.object({
  category: z.string().optional(),
  search: z.string().trim().max(120).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: productSortSchema.default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  featuredOnly: z.coerce.boolean().optional(),
});
export type ProductFilter = z.infer<typeof productFilterSchema>;

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2).max(64),
  color: z.string().max(40).nullish(),
  size: z.string().max(40).nullish(),
  price: z.number().int().nonnegative().nullish(),
  inventory: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const productImageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  alt: z.string().max(160).nullish(),
  position: z.number().int().nonnegative().default(0),
});

export const productInputSchema = z.object({
  name: z.string().min(2).max(160),
  slug: z
    .string()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide"),
  description: z.string().min(1).max(5000),
  basePrice: z.number().int().nonnegative(),
  currency: z.string().length(3).default("EUR"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  categoryId: z.string().nullish(),
  images: z.array(productImageInputSchema).default([]),
  variants: z.array(variantInputSchema).min(1, "Au moins une variante requise"),
});
export type ProductInput = z.infer<typeof productInputSchema>;
