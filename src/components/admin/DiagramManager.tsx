"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Eye, EyeOff, X, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  saveDiagram,
  deleteDiagram,
  setDiagramPublished,
} from "@/server/actions/diagrams";
import type { DiagramInput } from "@/schemas/diagram";
import type { FacetInstruction, FacetTier } from "@/lib/gem-studio/model/design";
import { parseAsc } from "@/lib/gem-studio/io/parseAsc";

export interface AdminDiagram {
  id: string;
  slug: string;
  name: string;
  family: "pierre" | "perle";
  description: string | null;
  pdfUrl: string | null;
  program: FacetInstruction[];
  scaleX: number;
  scaleZ: number;
  gear: number;
  appliesToAllStones: boolean;
  appliesToAllPearls: boolean;
  published: boolean;
  isSystem: boolean;
}

const TIERS: FacetTier[] = ["table", "crown", "girdle", "pavilion", "culet"];
const TIER_FR: Record<FacetTier, string> = {
  table: "Table",
  crown: "Couronne",
  girdle: "Rondiste",
  pavilion: "Pavillon",
  culet: "Culet",
};

const BLANK: AdminDiagram = {
  id: "",
  slug: "",
  name: "",
  family: "pierre",
  description: "",
  pdfUrl: "",
  program: [
    { tier: "table", angle: 90, index: 0, depth: 0.6, repeat: 1 },
    { tier: "crown", angle: 34.5, index: 0, depth: 0, repeat: 8 },
    { tier: "girdle", angle: 0, index: 0, depth: 1, repeat: 32 },
    { tier: "pavilion", angle: 40.75, index: 0, depth: 0, repeat: 8 },
    { tier: "culet", angle: 0, index: 0, depth: 1.1, repeat: 1 },
  ],
  scaleX: 1,
  scaleZ: 1,
  gear: 96,
  appliesToAllStones: true,
  appliesToAllPearls: false,
  published: false,
  isSystem: false,
};

export function DiagramManager({ initial }: { initial: AdminDiagram[] }) {
  const [editing, setEditing] = useState<AdminDiagram | null>(null);

  if (editing) {
    return <DiagramEditor draft={editing} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing({ ...BLANK, program: BLANK.program.map((p) => ({ ...p })) })}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" strokeWidth={1.8} />
        Nouveau diagramme
      </button>

      <div className="space-y-3">
        {initial.map((d) => (
          <DiagramRow key={d.id} d={d} onEdit={() => setEditing(d)} />
        ))}
      </div>
    </div>
  );
}

function DiagramRow({ d, onEdit }: { d: AdminDiagram; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const togglePublish = () =>
    start(async () => {
      await setDiagramPublished(d.id, !d.published);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!confirm(`Supprimer le diagramme « ${d.name} » ?`)) return;
      const res = await deleteDiagram(d.id);
      if (!res.ok) alert(res.message);
      router.refresh();
    });

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-serif text-lg">
          {d.name}
          {d.isSystem && (
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              système
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {d.family === "perle" ? "Perle" : "Pierre"} · {d.program.length} rangées · /{d.slug}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={togglePublish}
          disabled={pending}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors",
            d.published
              ? "bg-primary/10 text-primary"
              : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {d.published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {d.published ? "Publié" : "Masqué"}
        </button>
        <button
          onClick={onEdit}
          className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-foreground"
          aria-label="Éditer"
        >
          <Pencil className="size-4" strokeWidth={1.6} />
        </button>
        {!d.isSystem && (
          <button
            onClick={remove}
            disabled={pending}
            className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-destructive"
            aria-label="Supprimer"
          >
            <Trash2 className="size-4" strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}

function DiagramEditor({ draft, onClose }: { draft: AdminDiagram; onClose: () => void }) {
  const router = useRouter();
  const [d, setD] = useState<AdminDiagram>(draft);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<AdminDiagram>) => setD((cur) => ({ ...cur, ...patch }));

  // Import GemCAD : remplit nom, roue d'index et programme automatiquement.
  const importAsc = async (file: File) => {
    setError(null);
    try {
      const parsed = parseAsc(await file.text());
      setD((cur) => ({
        ...cur,
        name: cur.name || parsed.name,
        slug: cur.id ? cur.slug : slugify(cur.name || parsed.name),
        gear: parsed.gear,
        scaleX: 1,
        scaleZ: 1,
        program: parsed.program.instructions.map((r) => ({ ...r })),
      }));
    } catch {
      setError("Fichier .asc illisible.");
    }
  };

  const setRow = (i: number, patch: Partial<FacetInstruction>) =>
    setD((cur) => ({
      ...cur,
      program: cur.program.map((r, k) => (k === i ? { ...r, ...patch } : r)),
    }));

  const addRow = () =>
    setD((cur) => ({
      ...cur,
      program: [...cur.program, { tier: "crown", angle: 35, index: 0, depth: 0, repeat: 8 }],
    }));

  const removeRow = (i: number) =>
    setD((cur) => ({ ...cur, program: cur.program.filter((_, k) => k !== i) }));

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const save = () =>
    start(async () => {
      setError(null);
      const input: DiagramInput = {
        id: d.id || undefined,
        slug: d.slug || slugify(d.name),
        name: d.name,
        family: d.family,
        description: d.description || null,
        pdfUrl: d.pdfUrl || "",
        scaleX: d.scaleX,
        scaleZ: d.scaleZ,
        gear: d.gear,
        appliesToAllStones: d.appliesToAllStones,
        appliesToAllPearls: d.appliesToAllPearls,
        published: d.published,
        program: d.program,
      };
      const res = await saveDiagram(input);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.message);
      }
    });

  return (
    <div className="rounded-2xl bg-card p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">{d.id ? "Éditer le diagramme" : "Nouveau diagramme"}</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".asc,.txt"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importAsc(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-foreground hover:bg-foreground/[0.06]"
          >
            <Upload className="size-3.5" strokeWidth={1.8} />
            Importer .asc (GemCAD)
          </button>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Méta */}
      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Nom">
          <input
            value={d.name}
            onChange={(e) => set({ name: e.target.value, slug: d.id ? d.slug : slugify(e.target.value) })}
            className="adm-in"
            placeholder="ex. Coussin profond"
          />
        </L>
        <L label="Slug (URL)">
          <input value={d.slug} onChange={(e) => set({ slug: e.target.value })} className="adm-in" disabled={d.isSystem} />
        </L>
        <L label="Famille">
          <select value={d.family} onChange={(e) => set({ family: e.target.value as "pierre" | "perle" })} className="adm-in">
            <option value="pierre">Pierre précieuse</option>
            <option value="perle">Perle</option>
          </select>
        </L>
        <L label="Roue d'index (gear)">
          <input type="number" step={1} value={d.gear} onChange={(e) => set({ gear: parseInt(e.target.value) || 96 })} className="adm-in" />
        </L>
        <L label="PDF source (lien)">
          <input value={d.pdfUrl ?? ""} onChange={(e) => set({ pdfUrl: e.target.value })} className="adm-in" placeholder="https://…" />
        </L>
        <L label="Description">
          <input value={d.description ?? ""} onChange={(e) => set({ description: e.target.value })} className="adm-in" placeholder="Courte phrase affichée au client" />
        </L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Allongement L (axe long)">
            <input type="number" step={0.05} value={d.scaleZ} onChange={(e) => set({ scaleZ: parseFloat(e.target.value) || 1 })} className="adm-in" />
          </L>
          <L label="Largeur (axe court)">
            <input type="number" step={0.05} value={d.scaleX} onChange={(e) => set({ scaleX: parseFloat(e.target.value) || 1 })} className="adm-in" />
          </L>
        </div>
      </div>

      {/* Programme de facettage */}
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <p className="kicker">Programme de facettage</p>
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80">
            <Plus className="size-3.5" /> Ajouter une rangée
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Angle en degrés (90 = table). Index = cran de la roue. Profondeur : table/culet/rondiste
          (rayon 1). × = nombre de facettes de la rangée.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 pr-3 font-normal">Étage</th>
                <th className="pb-2 pr-3 font-normal">Angle°</th>
                <th className="pb-2 pr-3 font-normal">Index</th>
                <th className="pb-2 pr-3 font-normal">Profondeur</th>
                <th className="pb-2 pr-3 font-normal">×</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {d.program.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3">
                    <select value={r.tier} onChange={(e) => setRow(i, { tier: e.target.value as FacetTier })} className="adm-in">
                      {TIERS.map((t) => (
                        <option key={t} value={t}>{TIER_FR[t]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-3"><input type="number" step={0.1} value={r.angle} onChange={(e) => setRow(i, { angle: parseFloat(e.target.value) || 0 })} className="adm-in !w-20" /></td>
                  <td className="py-1 pr-3">
                    <input
                      type="text"
                      value={r.indices && r.indices.length ? r.indices.join(" ") : String(r.index)}
                      onChange={(e) => {
                        const nums = e.target.value.split(/[\s,]+/).map((x) => parseInt(x, 10)).filter((n) => !Number.isNaN(n));
                        if (nums.length > 1) setRow(i, { indices: nums, index: nums[0], repeat: nums.length });
                        else setRow(i, { index: nums[0] ?? 0, indices: undefined });
                      }}
                      className="adm-in !w-28"
                      title="Un cran, ou une liste (ex. 3 9 15)"
                    />
                  </td>
                  <td className="py-1 pr-3"><input type="number" step={0.05} value={r.depth} onChange={(e) => setRow(i, { depth: parseFloat(e.target.value) || 0 })} className="adm-in !w-24" /></td>
                  <td className="py-1 pr-3">
                    <input
                      type="number"
                      step={1}
                      value={r.indices && r.indices.length ? r.indices.length : r.repeat}
                      disabled={!!(r.indices && r.indices.length)}
                      onChange={(e) => setRow(i, { repeat: parseInt(e.target.value) || 1 })}
                      className="adm-in !w-16"
                    />
                  </td>
                  <td className="py-1">
                    <button onClick={() => removeRow(i)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive" aria-label="Retirer">
                      <Trash2 className="size-4" strokeWidth={1.6} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portée : à quelles matières ce diagramme est-il proposé ? */}
      <div className="mt-6 border-t border-border pt-5">
        <p className="kicker mb-3">Disponible pour</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={d.appliesToAllStones} onChange={(e) => set({ appliesToAllStones: e.target.checked })} />
            Toutes les pierres
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={d.appliesToAllPearls} onChange={(e) => set({ appliesToAllPearls: e.target.checked })} />
            Toutes les perles
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Pour ne le proposer qu'à certaines matières, laissez décoché et assignez-le
          depuis la fiche de chaque matière.
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={d.published} onChange={(e) => set({ published: e.target.checked })} />
          Publié (visible sur le configurateur)
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-xl bg-background px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            Annuler
          </button>
          <button onClick={save} disabled={pending || !d.name} className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
