import { z } from "zod";

/** Coordonnées + adresse de livraison du checkout (invité ou connecté). */
export const checkoutSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  fullName: z.string().min(2, "Nom requis").max(80),
  line1: z.string().min(3, "Adresse requise").max(120),
  line2: z.string().max(120).optional().or(z.literal("")),
  city: z.string().min(1, "Ville requise").max(80),
  postalCode: z.string().min(2, "Code postal requis").max(16),
  country: z
    .string()
    .length(2, "Code pays sur 2 lettres")
    .default("FR"),
  phone: z.string().max(30).optional().or(z.literal("")),
  couponCode: z.string().max(40).optional().or(z.literal("")),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
