import { prisma } from "@/lib/prisma";
import type { GemSpec } from "@/lib/gem-studio/model/spec";

export const dynamic = "force-dynamic";

const STATUS_FR: Record<string, string> = {
  NEW: "Nouvelle",
  REVIEWED: "Étudiée",
  QUOTED: "Devis envoyé",
  ACCEPTED: "Acceptée",
  CLOSED: "Close",
};

function fmtDate(d: Date): string {
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDevisPage() {
  const items = await prisma.devisRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Devis sur-mesure</h1>
          <p className="text-sm text-muted-foreground">
            Fiches techniques complètes des pierres configurées par les clients.
          </p>
        </div>
        <span className="rounded-full bg-card px-4 py-2 text-xs text-muted-foreground">
          {items.length} demande{items.length > 1 ? "s" : ""}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          Aucune demande de devis pour le moment.
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((it) => {
            const spec = (it.spec as unknown as GemSpec | null) ?? null;
            return (
              <article key={it.id} className="rounded-2xl bg-card p-6">
                {/* En-tête */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl">{it.contactName}</p>
                    <p className="text-sm text-muted-foreground">
                      <a href={`mailto:${it.contactEmail}`} className="hover:text-foreground">
                        {it.contactEmail}
                      </a>
                      {it.phone ? ` · ${it.phone}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                      {STATUS_FR[it.status] ?? it.status}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">{fmtDate(it.createdAt)}</p>
                  </div>
                </div>

                {/* Sélection */}
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  <Tag>{it.gemKind === "perle" ? "Perle" : "Pierre"}</Tag>
                  <Tag>{it.stone}</Tag>
                  <Tag>Taille {it.cut}</Tag>
                  <Tag>{it.mounting}</Tag>
                  {it.material && <Tag>{it.material}</Tag>}
                  {it.occasion && <Tag>{it.occasion}</Tag>}
                  {it.inspirationCount > 0 && <Tag>{it.inspirationCount} inspiration(s)</Tag>}
                </div>

                {/* Message client */}
                {it.message && (
                  <p className="mt-4 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                    « {it.message} »
                  </p>
                )}

                {/* Fiche technique */}
                {spec ? (
                  <div className="mt-5 rounded-xl bg-background p-5">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                      Fiche technique lapidaire
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                      <Field label="Poids" value={`${spec.caratWeight} ct`} />
                      <Field label="Dimensions" value={`${spec.lengthMm}×${spec.diameterMm}×${spec.depthMm} mm`} />
                      <Field label="Table" value={spec.tablePercent != null ? `${spec.tablePercent} %` : "—"} />
                      <Field label="Couronne" value={spec.crownAngleDeg != null ? `${spec.crownAngleDeg}°` : "—"} />
                      <Field label="Pavillon" value={spec.pavilionAngleDeg != null ? `${spec.pavilionAngleDeg}°` : "—"} />
                      <Field label="Facettes" value={`${spec.mainFacets} princ.`} />
                      <Field label="Rondiste" value={`${spec.girdleFacets} côtés`} />
                      <Field label="Allongement" value={spec.elongation === 1 ? "rond" : `×${spec.elongation}`} />
                      <Field label="Culet" value={spec.hasCulet ? "pointe" : "fond plat"} />
                      <Field label="Couleur" value={`${spec.colorIntensityPct} %`} />
                      <Field label="Indice (IOR)" value={`${spec.refractiveIndex}`} />
                      <Field label="Dispersion" value={`${spec.dispersion}`} />
                    </div>

                    {/* Programme de facettage */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground">
                        Programme de facettage ({spec.facetingProgram.length} rangées)
                      </summary>
                      <table className="mt-3 w-full text-left text-xs">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="py-1 pr-4 font-normal">Étage</th>
                            <th className="py-1 pr-4 font-normal">Angle</th>
                            <th className="py-1 pr-4 font-normal">Index</th>
                            <th className="py-1 pr-4 font-normal">Profondeur</th>
                            <th className="py-1 font-normal">×</th>
                          </tr>
                        </thead>
                        <tbody className="tabular-nums">
                          {spec.facetingProgram.map((r, i) => (
                            <tr key={i} className="border-t border-border/60">
                              <td className="py-1 pr-4 capitalize">{r.tier}</td>
                              <td className="py-1 pr-4">{r.angleDeg}°</td>
                              <td className="py-1 pr-4">{r.index}</td>
                              <td className="py-1 pr-4">{r.depthRel}</td>
                              <td className="py-1">{r.repeat}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  </div>
                ) : (
                  <p className="mt-5 text-xs text-muted-foreground">
                    Pas de fiche technique 3D (perle ou ancienne demande).
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-background px-3 py-1 text-muted-foreground">{children}</span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="font-serif text-base text-foreground">{value}</dd>
    </div>
  );
}
