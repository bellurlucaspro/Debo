import { z } from "zod";

/** Inscription newsletter (double opt-in). */
export const newsletterSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  source: z.string().max(60).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
