import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown, ShoppingBag } from "lucide-react";

import { getAdminStats } from "@/server/actions/analytics";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { formatMoney, cn } from "@/lib/utils";

function relativeFr(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const w = Math.floor(d / 7);
  return `il y a ${w} sem.`;
}

const STATUS_FR: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En traitement",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  REFUNDED: "Remboursée",
};

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();
  const hasRevenue = stats.totalRevenue > 0;

  return (
    <div className="space-y-5">
      {/* Bandeau */}
      <div className="inline-flex rounded-full bg-card px-4 py-2 text-xs text-muted-foreground">
        Bienvenue dans le Control Tower — pilotez DEBO en un coup d'œil.
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Colonne gauche */}
        <div className="space-y-5">
          {/* Chiffre d'affaires */}
          <div className="rounded-2xl bg-primary p-7 text-primary-foreground">
            <p className="text-sm/none opacity-80">Chiffre d'affaires total</p>
            <p className="mt-4 font-serif text-5xl tabular-nums md:text-6xl">
              {formatMoney(stats.totalRevenue, stats.currency)}
            </p>
            <p className="mt-3 text-xs opacity-70">
              {stats.orderCount} commande{stats.orderCount > 1 ? "s" : ""} payée
              {stats.orderCount > 1 ? "s" : ""} · {stats.totalOrders} au total
            </p>
          </div>

          {/* Activité récente */}
          <div className="rounded-2xl bg-card p-6">
            <h2 className="font-serif text-2xl">Activité récente</h2>
            <ul className="mt-5 space-y-4">
              {stats.recentOrders.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Aucune commande pour le moment.
                </li>
              ) : (
                stats.recentOrders.map((o) => (
                  <li
                    key={o.orderNumber}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 place-items-center rounded-full bg-background text-[11px] font-medium">
                        {(o.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {o.email ?? o.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relativeFr(o.createdAt)} · {STATUS_FR[o.status]}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-primary">
                      +{formatMoney(o.total, o.currency)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-5">
          {/* Graphique CA */}
          <div className="rounded-2xl bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">Chiffre d'affaires</h2>
              <span className="text-xs text-muted-foreground">7 mois</span>
            </div>
            <div className="mt-4">
              <RevenueChart data={stats.monthly} currency={stats.currency} />
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-2xl bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Commandes</p>
                <div className="grid size-9 place-items-center rounded-full bg-background">
                  <ShoppingBag className="size-4" strokeWidth={1.6} />
                </div>
              </div>
              <p className="mt-4 font-serif text-3xl tabular-nums">
                {stats.orderCount}
              </p>
            </div>
            <div className="rounded-2xl bg-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Panier moyen</p>
                <div className="grid size-9 place-items-center rounded-full bg-background">
                  {hasRevenue ? (
                    <TrendingUp className="size-4" strokeWidth={1.6} />
                  ) : (
                    <TrendingDown className="size-4" strokeWidth={1.6} />
                  )}
                </div>
              </div>
              <p className="mt-4 font-serif text-3xl tabular-nums">
                {formatMoney(stats.aov, stats.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top créations */}
      <div className="rounded-2xl bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Top créations</h2>
            <p className="text-sm text-muted-foreground">
              Les plus commandées
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {stats.topProducts.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Pas encore de ventes.
              </span>
            ) : (
              stats.topProducts.map((p) => (
                <div
                  key={p.name}
                  className="rounded-xl bg-background px-4 py-3"
                >
                  <p className="max-w-[10rem] truncate text-sm font-medium">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.quantity} vendu{p.quantity > 1 ? "s" : ""}
                  </p>
                </div>
              ))
            )}
            <Link
              href="/admin/products"
              className={cn(
                "flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
              )}
            >
              Tout voir
              <ArrowRight className="size-4" strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
