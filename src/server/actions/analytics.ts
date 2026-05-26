"use server";

import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/server/auth/auth";

const MONTHS_FR = [
  "Janv.",
  "Févr.",
  "Mars",
  "Avr.",
  "Mai",
  "Juin",
  "Juil.",
  "Août",
  "Sept.",
  "Oct.",
  "Nov.",
  "Déc.",
];

export type AdminStats = {
  totalRevenue: number; // centimes
  orderCount: number; // commandes payées
  aov: number; // panier moyen (centimes)
  totalOrders: number; // toutes commandes
  currency: string;
  monthly: { label: string; revenue: number }[];
  recentOrders: {
    orderNumber: string;
    email: string | null;
    total: number;
    currency: string;
    status: OrderStatus;
    createdAt: Date;
  }[];
  topProducts: { name: string; quantity: number }[];
};

/** Construit les 7 derniers mois (libellé + clé année-mois) à 0. */
function buildMonths() {
  const now = new Date();
  const months: { key: string; label: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTHS_FR[d.getMonth()]!,
      revenue: 0,
    });
  }
  return months;
}

function emptyStats(): AdminStats {
  return {
    totalRevenue: 0,
    orderCount: 0,
    aov: 0,
    totalOrders: 0,
    currency: "EUR",
    monthly: buildMonths().map((m) => ({ label: m.label, revenue: m.revenue })),
    recentOrders: [],
    topProducts: [],
  };
}

/**
 * Statistiques du tableau de bord admin. Réservé aux ADMIN ; résilient (renvoie
 * des valeurs nulles plutôt qu'une erreur si la base est indisponible).
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return emptyStats();

    const paid = await prisma.order.findMany({
      where: { paymentStatus: "SUCCEEDED" },
      select: { total: true, createdAt: true, currency: true },
    });

    const totalRevenue = paid.reduce((sum, o) => sum + o.total, 0);
    const orderCount = paid.length;
    const aov = orderCount ? Math.round(totalRevenue / orderCount) : 0;
    const totalOrders = await prisma.order.count();

    const months = buildMonths();
    for (const o of paid) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.revenue += o.total;
    }

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        orderNumber: true,
        email: true,
        total: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    const topRaw = await prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 3,
    });
    const topProducts = topRaw.map((t) => ({
      name: t.productName,
      quantity: t._sum.quantity ?? 0,
    }));

    return {
      totalRevenue,
      orderCount,
      aov,
      totalOrders,
      currency: paid[0]?.currency ?? recentOrders[0]?.currency ?? "EUR",
      monthly: months.map((m) => ({ label: m.label, revenue: m.revenue })),
      recentOrders,
      topProducts,
    };
  } catch {
    return emptyStats();
  }
}
