"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/rbac";
import { BASE_DIAGRAMS } from "@/lib/gem-studio/model/presets";
import type { FacetInstruction } from "@/lib/gem-studio/model/design";
import { diagramInputSchema, type DiagramDTO, type DiagramInput } from "@/schemas/diagram";

/* ── Lecture publique (front) ─────────────────────────────────────────────── */

// Lance la synchro une seule fois par processus (la géométrie système est figée au boot).
let _seedSynced = false;

/**
 * Garantit la présence des 6 diagrammes « système » et RESYNCHRONISE leur
 * géométrie (programme/silhouette/gear) sur `BASE_DIAGRAMS` — indispensable
 * quand la convention de taille évolue. Les diagrammes non-système (créés en
 * admin) ne sont jamais touchés ; le nom/publication/portée des système non plus.
 */
export async function ensureDiagramsSeed(): Promise<void> {
  if (_seedSynced) return;
  _seedSynced = true;

  for (let i = 0; i < BASE_DIAGRAMS.length; i++) {
    const d = BASE_DIAGRAMS[i]!;
    const geometry = {
      program: d.program.instructions as unknown as object[],
      scaleX: d.program.scaleX,
      scaleZ: d.program.scaleZ,
      gear: d.program.gear ?? 96,
    };
    const existing = await prisma.cutDiagram.findUnique({ where: { slug: d.slug } });
    if (!existing) {
      await prisma.cutDiagram.create({
        data: {
          ...geometry,
          slug: d.slug,
          name: d.name,
          family: d.family,
          description: d.description,
          appliesToAllStones: true,
          appliesToAllPearls: true,
          published: true,
          isSystem: true,
          sortOrder: i,
        },
      });
    } else if (existing.isSystem) {
      // Recale uniquement la géométrie (préserve nom/publication/portée).
      await prisma.cutDiagram.update({ where: { slug: d.slug }, data: geometry });
    }
  }

  // Diagrammes système sans portée (anciens seeds) → toutes pierres + perles.
  await prisma.cutDiagram.updateMany({
    where: { isSystem: true, appliesToAllStones: false, appliesToAllPearls: false },
    data: { appliesToAllStones: true, appliesToAllPearls: true },
  });
}

export async function listPublishedDiagrams(): Promise<DiagramDTO[]> {
  await ensureDiagramsSeed();
  const rows = await prisma.cutDiagram.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDTO);
}

/* ── Admin ────────────────────────────────────────────────────────────────── */

export async function listAllDiagrams() {
  await requireAdmin();
  await ensureDiagramsSeed();
  return prisma.cutDiagram.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function saveDiagram(raw: DiagramInput) {
  await requireAdmin();
  const parsed = diagramInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  const data = {
    slug: d.slug,
    name: d.name,
    family: d.family,
    description: d.description || null,
    pdfUrl: d.pdfUrl || null,
    program: d.program as unknown as object[],
    scaleX: d.scaleX,
    scaleZ: d.scaleZ,
    gear: d.gear,
    appliesToAllStones: d.appliesToAllStones,
    appliesToAllPearls: d.appliesToAllPearls,
    published: d.published,
  };

  try {
    if (d.id) {
      await prisma.cutDiagram.update({ where: { id: d.id }, data });
    } else {
      const max = await prisma.cutDiagram.aggregate({ _max: { sortOrder: true } });
      await prisma.cutDiagram.create({
        data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 },
      });
    }
  } catch (err) {
    console.error("[DIAGRAM save]", err);
    return { ok: false as const, message: "Échec de l'enregistrement (slug déjà utilisé ?)." };
  }

  revalidatePath("/admin/diagrammes");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

export async function setDiagramPublished(id: string, published: boolean) {
  await requireAdmin();
  await prisma.cutDiagram.update({ where: { id }, data: { published } });
  revalidatePath("/admin/diagrammes");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

export async function deleteDiagram(id: string) {
  await requireAdmin();
  const row = await prisma.cutDiagram.findUnique({ where: { id } });
  if (row?.isSystem) {
    return { ok: false as const, message: "Un diagramme système ne peut pas être supprimé (dépubliez-le)." };
  }
  await prisma.cutDiagram.delete({ where: { id } });
  revalidatePath("/admin/diagrammes");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function toDTO(row: {
  id: string;
  slug: string;
  name: string;
  family: string;
  description: string | null;
  program: unknown;
  scaleX: number;
  scaleZ: number;
  gear: number;
}): DiagramDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    family: row.family === "perle" ? "perle" : "pierre",
    description: row.description,
    instructions: (row.program as FacetInstruction[]) ?? [],
    scaleX: row.scaleX,
    scaleZ: row.scaleZ,
    gear: row.gear,
  };
}
