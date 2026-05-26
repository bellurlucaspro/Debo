"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Eye, EyeOff, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { saveMaterial, deleteMaterial, setMaterialPublished } from "@/server/actions/materials";
import type { AdminMaterial, MaterialInput, MaterialPickDiagram } from "@/schemas/material";
import { appearancesFor, getAppearance } from "@/lib/gem-studio/model/appearances";

const BLANK: AdminMaterial = {
  id: "",
  slug: "",
  name: "",
  kind: "pierre",
  appearance: "saphir-bleu",
  colorHex: "#2E4E9B",
  blurb: "",
  published: false,
  isSystem: false,
  diagramIds: [],
};

export function MaterialManager({
  initial,
  diagrams,
}: {
  initial: AdminMaterial[];
  diagrams: MaterialPickDiagram[];
}) {
  const [editing, setEditing] = useState<AdminMaterial | null>(null);

  if (editing) {
    return <MaterialEditor draft={editing} diagrams={diagrams} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setEditing({ ...BLANK })}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Plus className="size-4" strokeWidth={1.8} />
        Nouvelle matière
      </button>

      <div className="space-y-3">
        {initial.map((m) => (
          <MaterialRow key={m.id} m={m} onEdit={() => setEditing(m)} />
        ))}
      </div>
    </div>
  );
}

function MaterialRow({ m, onEdit }: { m: AdminMaterial; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const togglePublish = () =>
    start(async () => {
      await setMaterialPublished(m.id, !m.published);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!confirm(`Supprimer la matière « ${m.name} » ?`)) return;
      const res = await deleteMaterial(m.id);
      if (!res.ok) alert(res.message);
      router.refresh();
    });

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-card p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="size-8 shrink-0 rounded-full border border-border" style={{ backgroundColor: m.colorHex }} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-serif text-lg">
            {m.name}
            {m.isSystem && (
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">système</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {m.kind === "perle" ? "Perle" : "Pierre"} · {getAppearance(m.appearance)?.label ?? m.appearance} ·{" "}
            {m.diagramIds.length} diagramme(s) spécifique(s)
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={togglePublish}
          disabled={pending}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors",
            m.published ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          {m.published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {m.published ? "Publiée" : "Masquée"}
        </button>
        <button onClick={onEdit} className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-foreground" aria-label="Éditer">
          <Pencil className="size-4" strokeWidth={1.6} />
        </button>
        {!m.isSystem && (
          <button onClick={remove} disabled={pending} className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-destructive" aria-label="Supprimer">
            <Trash2 className="size-4" strokeWidth={1.6} />
          </button>
        )}
      </div>
    </div>
  );
}

function MaterialEditor({
  draft,
  diagrams,
  onClose,
}: {
  draft: AdminMaterial;
  diagrams: MaterialPickDiagram[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [m, setM] = useState<AdminMaterial>(draft);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<AdminMaterial>) => setM((cur) => ({ ...cur, ...patch }));
  const textures = appearancesFor(m.kind);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Diagrammes déjà disponibles via une portée « toutes les X » (auto).
  const autoAvailable = (d: MaterialPickDiagram) =>
    m.kind === "perle" ? d.appliesToAllPearls : d.appliesToAllStones;

  const toggleDiagram = (id: string) =>
    setM((cur) => ({
      ...cur,
      diagramIds: cur.diagramIds.includes(id)
        ? cur.diagramIds.filter((x) => x !== id)
        : [...cur.diagramIds, id],
    }));

  const save = () =>
    start(async () => {
      setError(null);
      const input: MaterialInput = {
        id: m.id || undefined,
        slug: m.slug || slugify(m.name),
        name: m.name,
        kind: m.kind,
        appearance: m.appearance,
        colorHex: m.colorHex,
        blurb: m.blurb || null,
        published: m.published,
        diagramIds: m.diagramIds,
      };
      const res = await saveMaterial(input);
      if (res.ok) {
        router.refresh();
        onClose();
      } else setError(res.message);
    });

  const onKindChange = (kind: "pierre" | "perle") => {
    const first = appearancesFor(kind)[0];
    set({ kind, appearance: first?.id ?? "", colorHex: first?.colorHex ?? m.colorHex });
  };

  const onAppearanceChange = (id: string) => {
    const a = getAppearance(id);
    set({ appearance: id, colorHex: a?.colorHex ?? m.colorHex });
  };

  return (
    <div className="rounded-2xl bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{m.id ? "Éditer la matière" : "Nouvelle matière"}</h2>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-lg bg-background text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Nom">
          <input
            value={m.name}
            onChange={(e) => set({ name: e.target.value, slug: m.id ? m.slug : slugify(e.target.value) })}
            className="adm-in"
            placeholder="ex. Saphir du Cachemire"
          />
        </L>
        <L label="Slug (URL)">
          <input value={m.slug} onChange={(e) => set({ slug: e.target.value })} className="adm-in" disabled={m.isSystem} />
        </L>
        <L label="Famille">
          <select value={m.kind} onChange={(e) => onKindChange(e.target.value as "pierre" | "perle")} className="adm-in" disabled={m.isSystem}>
            <option value="pierre">Pierre précieuse</option>
            <option value="perle">Perle de culture</option>
          </select>
        </L>
        <L label="Texture / apparence">
          <select value={m.appearance} onChange={(e) => onAppearanceChange(e.target.value)} className="adm-in">
            {textures.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </L>
        <L label="Couleur (pastille)">
          <div className="flex items-center gap-2">
            <input type="color" value={m.colorHex} onChange={(e) => set({ colorHex: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
            <input value={m.colorHex} onChange={(e) => set({ colorHex: e.target.value })} className="adm-in" />
          </div>
        </L>
        <L label="Description courte">
          <input value={m.blurb ?? ""} onChange={(e) => set({ blurb: e.target.value })} className="adm-in" placeholder="Affichée au client" />
        </L>
      </div>

      {/* Diagrammes testables */}
      <div className="mt-7">
        <p className="kicker mb-2">Diagrammes testables par le visiteur</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Cochez les diagrammes spécifiques à cette matière. Ceux marqués « auto » sont déjà
          proposés via leur portée (toutes les {m.kind === "perle" ? "perles" : "pierres"}).
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {diagrams.map((d) => {
            const auto = autoAvailable(d);
            const checked = auto || m.diagramIds.includes(d.id);
            return (
              <label
                key={d.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  auto ? "border-border/60 bg-background/50 text-muted-foreground" : "border-border cursor-pointer hover:border-foreground/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={auto}
                  onChange={() => toggleDiagram(d.id)}
                />
                <span className="flex-1">{d.name}</span>
                {auto && <span className="text-[10px] uppercase tracking-wide">auto</span>}
              </label>
            );
          })}
          {diagrams.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun diagramme publié pour l'instant.</p>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={m.published} onChange={(e) => set({ published: e.target.checked })} />
          Publiée (visible sur le configurateur)
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-xl bg-background px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">Annuler</button>
          <button onClick={save} disabled={pending || !m.name} className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
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
