import { listAllDiagrams } from "@/server/actions/diagrams";
import { DiagramManager, type AdminDiagram } from "@/components/admin/DiagramManager";
import type { FacetInstruction } from "@/lib/gem-studio/model/design";

export const dynamic = "force-dynamic";

export default async function AdminDiagramsPage() {
  const rows = await listAllDiagrams();
  const diagrams: AdminDiagram[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    family: r.family === "perle" ? "perle" : "pierre",
    description: r.description,
    pdfUrl: r.pdfUrl,
    program: (r.program as unknown as FacetInstruction[]) ?? [],
    scaleX: r.scaleX,
    scaleZ: r.scaleZ,
    gear: r.gear,
    appliesToAllStones: r.appliesToAllStones,
    appliesToAllPearls: r.appliesToAllPearls,
    published: r.published,
    isSystem: r.isSystem,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Diagrammes de taille</h1>
        <p className="text-sm text-muted-foreground">
          Transcrivez vos diagrammes (table angle / index). Publiés, ils apparaissent
          dans le configurateur où les clients les ajustent.
        </p>
      </div>
      <DiagramManager initial={diagrams} />
    </div>
  );
}
