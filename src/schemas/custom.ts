import { z } from "zod";

/** Fiche technique lapidaire (générée par le configurateur 3D). */
export const gemSpecSchema = z.object({
  speciesLabel: z.string(),
  cutLabel: z.string(),
  styleLabel: z.string(),
  caratWeight: z.number(),
  diameterMm: z.number(),
  lengthMm: z.number(),
  depthMm: z.number(),
  tablePercent: z.number().nullable(),
  crownAngleDeg: z.number().nullable(),
  pavilionAngleDeg: z.number().nullable(),
  mainFacets: z.number(),
  girdleFacets: z.number(),
  hasCulet: z.boolean(),
  elongation: z.number(),
  colorIntensityPct: z.number(),
  refractiveIndex: z.number(),
  dispersion: z.number(),
  facetingProgram: z.array(
    z.object({
      tier: z.string(),
      angleDeg: z.number(),
      index: z.number(),
      depthRel: z.number(),
      repeat: z.number(),
    }),
  ),
  summaryLines: z.array(z.string()),
});

export type GemSpecPayload = z.infer<typeof gemSpecSchema>;

/** Demande de devis sur-mesure (configurateur). */
export const customRequestSchema = z.object({
  stone: z.string().min(1, "Choisissez une pierre."),
  cut: z.string().min(1, "Choisissez une taille."),
  gemKind: z.enum(["pierre", "perle"]).default("pierre"),
  mounting: z.string().min(1),
  material: z.string().optional(),
  carat: z.string().optional(),
  grammage: z.string().max(40).optional(),
  occasion: z.string().max(80).optional(),
  message: z.string().max(2000).optional(),
  inspirationCount: z.number().int().min(0).max(20).default(0),
  /** Fiche technique complète (pierres précieuses configurées en 3D). */
  gemSpec: gemSpecSchema.optional(),
  name: z.string().min(2, "Votre nom.").max(120),
  email: z.string().email("E-mail invalide."),
  phone: z.string().max(40).optional(),
});

export type CustomRequest = z.infer<typeof customRequestSchema>;
