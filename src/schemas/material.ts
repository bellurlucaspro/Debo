import { z } from "zod";

import type { DiagramDTO } from "./diagram";

/** Entrée de l'éditeur de matière (admin). */
export const materialInputSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres et tirets."),
  name: z.string().min(2).max(80),
  kind: z.enum(["pierre", "perle"]),
  appearance: z.string().min(1, "Choisissez une texture."),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hex invalide."),
  blurb: z.string().max(200).optional().nullable(),
  published: z.boolean().default(false),
  /** Diagrammes spécifiquement assignés à cette matière. */
  diagramIds: z.array(z.string()).default([]),
});

export type MaterialInput = z.infer<typeof materialInputSchema>;

/** Matière envoyée au front. `diagramIds` = diagrammes testables (portée résolue). */
export interface MaterialDTO {
  id: string;
  slug: string;
  name: string;
  kind: "pierre" | "perle";
  appearance: string;
  colorHex: string;
  blurb: string | null;
  diagramIds: string[];
}

export interface StorefrontData {
  materials: MaterialDTO[];
  diagrams: DiagramDTO[];
}

/** Matière côté admin (avec assignations spécifiques). */
export interface AdminMaterial {
  id: string;
  slug: string;
  name: string;
  kind: "pierre" | "perle";
  appearance: string;
  colorHex: string;
  blurb: string | null;
  published: boolean;
  isSystem: boolean;
  diagramIds: string[];
}

/** Diagramme proposable à une matière (sélecteur admin). */
export interface MaterialPickDiagram {
  id: string;
  name: string;
  family: "pierre" | "perle";
  appliesToAllStones: boolean;
  appliesToAllPearls: boolean;
}
