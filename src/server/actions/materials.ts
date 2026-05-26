"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/auth/rbac";
import { ensureDiagramsSeed } from "@/server/actions/diagrams";
import {
  materialInputSchema,
  type AdminMaterial,
  type MaterialInput,
  type StorefrontData,
} from "@/schemas/material";
import type { DiagramDTO } from "@/schemas/diagram";
import type { FacetInstruction } from "@/lib/gem-studio/model/design";

/* ── Matières « système » (les 10 du catalogue d'origine) ─────────────────── */
const SYSTEM_MATERIALS = [
  { slug: "perle-blanche", name: "Perle de culture blanche", kind: "perle", appearance: "perle-blanche", colorHex: "#F1EADD", blurb: "Nacre crémeuse, reflets dorés." },
  { slug: "perle-tahiti", name: "Perle de Tahiti", kind: "perle", appearance: "perle-tahiti", colorHex: "#3B3A3A", blurb: "Noir profond aux reflets paon." },
  { slug: "perle-doree", name: "Perle dorée des Philippines", kind: "perle", appearance: "perle-doree", colorHex: "#E6C684", blurb: "Or chaud, lumière du soir." },
  { slug: "perle-peche", name: "Perle pêche", kind: "perle", appearance: "perle-peche", colorHex: "#E9B9A3", blurb: "Rosé tendre, nacre vivante." },
  { slug: "saphir", name: "Saphir", kind: "pierre", appearance: "saphir-bleu", colorHex: "#2E4E9B", blurb: "Bleu velours, feu discret." },
  { slug: "emeraude", name: "Émeraude", kind: "pierre", appearance: "emeraude", colorHex: "#1F8158", blurb: "Vert jardin, jardin intérieur." },
  { slug: "rubis", name: "Rubis", kind: "pierre", appearance: "rubis", colorHex: "#8A1F2D", blurb: "Rouge sang de pigeon." },
  { slug: "tanzanite", name: "Tanzanite", kind: "pierre", appearance: "tanzanite", colorHex: "#5A50A6", blurb: "Bleu-violet trichroïque." },
  { slug: "amethyste", name: "Améthyste", kind: "pierre", appearance: "amethyste", colorHex: "#7B4EA0", blurb: "Violet profond et lumineux." },
  { slug: "topaze", name: "Topaze impériale", kind: "pierre", appearance: "topaze-imperiale", colorHex: "#D98E4E", blurb: "Ambre doré, chaleur rare." },
];

async function ensureCatalog(): Promise<void> {
  await ensureDiagramsSeed();
  const count = await prisma.gemMaterial.count();
  if (count === 0) {
    await prisma.gemMaterial.createMany({
      data: SYSTEM_MATERIALS.map((m, i) => ({ ...m, published: true, isSystem: true, sortOrder: i })),
      skipDuplicates: true,
    });
  }
}

/* ── Lecture publique (front) ─────────────────────────────────────────────── */

export async function listStorefront(): Promise<StorefrontData> {
  await ensureCatalog();
  const [materials, diagrams] = await Promise.all([
    prisma.gemMaterial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { diagrams: true },
    }),
    prisma.cutDiagram.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const pubIds = new Set(diagrams.map((d) => d.id));
  const allStoneIds = diagrams.filter((d) => d.appliesToAllStones).map((d) => d.id);
  const allPearlIds = diagrams.filter((d) => d.appliesToAllPearls).map((d) => d.id);

  const materialDTOs = materials.map((m) => {
    const specific = m.diagrams.map((j) => j.diagramId).filter((id) => pubIds.has(id));
    const scope = m.kind === "perle" ? allPearlIds : allStoneIds;
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      kind: m.kind === "perle" ? ("perle" as const) : ("pierre" as const),
      appearance: m.appearance,
      colorHex: m.colorHex,
      blurb: m.blurb,
      diagramIds: Array.from(new Set([...scope, ...specific])),
    };
  });

  return { materials: materialDTOs, diagrams: diagrams.map(toDiagramDTO) };
}

/* ── Admin ────────────────────────────────────────────────────────────────── */

export async function listAllMaterials(): Promise<AdminMaterial[]> {
  await requireAdmin();
  await ensureCatalog();
  const rows = await prisma.gemMaterial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { diagrams: true },
  });
  return rows.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    kind: m.kind === "perle" ? "perle" : "pierre",
    appearance: m.appearance,
    colorHex: m.colorHex,
    blurb: m.blurb,
    published: m.published,
    isSystem: m.isSystem,
    diagramIds: m.diagrams.map((j) => j.diagramId),
  }));
}

export async function saveMaterial(raw: MaterialInput) {
  await requireAdmin();
  const parsed = materialInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const d = parsed.data;
  const base = {
    slug: d.slug,
    name: d.name,
    kind: d.kind,
    appearance: d.appearance,
    colorHex: d.colorHex,
    blurb: d.blurb || null,
    published: d.published,
  };

  try {
    if (d.id) {
      const id = d.id;
      await prisma.$transaction([
        prisma.gemMaterial.update({ where: { id }, data: base }),
        prisma.stoneDiagram.deleteMany({ where: { materialId: id } }),
        prisma.stoneDiagram.createMany({
          data: d.diagramIds.map((diagramId) => ({ materialId: id, diagramId })),
          skipDuplicates: true,
        }),
      ]);
    } else {
      const max = await prisma.gemMaterial.aggregate({ _max: { sortOrder: true } });
      const created = await prisma.gemMaterial.create({
        data: { ...base, sortOrder: (max._max.sortOrder ?? 0) + 1 },
      });
      if (d.diagramIds.length) {
        await prisma.stoneDiagram.createMany({
          data: d.diagramIds.map((diagramId) => ({ materialId: created.id, diagramId })),
          skipDuplicates: true,
        });
      }
    }
  } catch (err) {
    console.error("[MATERIAL save]", err);
    return { ok: false as const, message: "Échec de l'enregistrement (slug déjà utilisé ?)." };
  }

  revalidatePath("/admin/matieres");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

export async function setMaterialPublished(id: string, published: boolean) {
  await requireAdmin();
  await prisma.gemMaterial.update({ where: { id }, data: { published } });
  revalidatePath("/admin/matieres");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

export async function deleteMaterial(id: string) {
  await requireAdmin();
  const row = await prisma.gemMaterial.findUnique({ where: { id } });
  if (row?.isSystem) {
    return { ok: false as const, message: "Une matière système ne peut pas être supprimée (masquez-la)." };
  }
  await prisma.gemMaterial.delete({ where: { id } });
  revalidatePath("/admin/matieres");
  revalidatePath("/sur-mesure");
  return { ok: true as const };
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function toDiagramDTO(row: {
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
