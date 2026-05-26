import { z } from "zod";

import type { FacetInstruction } from "@/lib/gem-studio/model/design";

/** Une rangée du programme de facettage. */
export const instructionSchema = z.object({
  tier: z.enum(["table", "crown", "girdle", "pavilion", "culet"]),
  angle: z.number().min(0).max(90),
  index: z.number().int().min(0).max(360),
  depth: z.number().min(0).max(3),
  repeat: z.number().int().min(1).max(120),
  /** Crans d'index explicites (import GemCAD). */
  indices: z.array(z.number().int().min(0).max(360)).optional(),
});

/** Entrée de l'éditeur de diagramme (admin). */
export const diagramInputSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres et tirets."),
  name: z.string().min(2).max(80),
  family: z.enum(["pierre", "perle"]),
  description: z.string().max(300).optional().nullable(),
  pdfUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  scaleX: z.number().min(0.3).max(3).default(1),
  scaleZ: z.number().min(0.3).max(3).default(1),
  gear: z.number().int().min(1).max(360).default(96),
  appliesToAllStones: z.boolean().default(false),
  appliesToAllPearls: z.boolean().default(false),
  published: z.boolean().default(false),
  program: z.array(instructionSchema).min(2, "Au moins 2 facettes."),
});

export type DiagramInput = z.infer<typeof diagramInputSchema>;

/** DTO envoyé au front (programme prêt à passer à `applyModifiers`). */
export interface DiagramDTO {
  id: string;
  slug: string;
  name: string;
  family: "pierre" | "perle";
  description: string | null;
  instructions: FacetInstruction[];
  scaleX: number;
  scaleZ: number;
  gear: number;
}
