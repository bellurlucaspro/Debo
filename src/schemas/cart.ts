import { z } from "zod";

/** Schémas de mutation du panier (validés côté serveur dans les actions). */

export const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const updateCartItemSchema = z.object({
  variantId: z.string().min(1),
  // 0 => suppression de la ligne.
  quantity: z.coerce.number().int().min(0).max(20),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
