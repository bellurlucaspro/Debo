import { listAllMaterials } from "@/server/actions/materials";
import { listAllDiagrams } from "@/server/actions/diagrams";
import { MaterialManager } from "@/components/admin/MaterialManager";
import type { MaterialPickDiagram } from "@/schemas/material";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
  const [materials, diagramRows] = await Promise.all([listAllMaterials(), listAllDiagrams()]);

  const diagrams: MaterialPickDiagram[] = diagramRows
    .filter((d) => d.published)
    .map((d) => ({
      id: d.id,
      name: d.name,
      family: d.family === "perle" ? "perle" : "pierre",
      appliesToAllStones: d.appliesToAllStones,
      appliesToAllPearls: d.appliesToAllPearls,
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl">Pierres & perles</h1>
        <p className="text-sm text-muted-foreground">
          Ajoutez vos matières, choisissez une texture, et attribuez-leur les diagrammes
          que vos visiteurs pourront tester.
        </p>
      </div>
      <MaterialManager initial={materials} diagrams={diagrams} />
    </div>
  );
}
