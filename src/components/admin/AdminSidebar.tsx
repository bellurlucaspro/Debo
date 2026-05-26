"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Mail,
  Gem,
  Scissors,
  Sparkles,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", icon: Receipt },
  { href: "/admin/devis", label: "Devis sur-mesure", icon: Gem },
  { href: "/admin/matieres", label: "Pierres & perles", icon: Sparkles },
  { href: "/admin/diagrammes", label: "Diagrammes", icon: Scissors },
  { href: "/admin/products", label: "Produits", icon: Package },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between rounded-2xl bg-card p-6">
      <div>
        {/* Profil */}
        <div className="flex flex-col items-center gap-2 pb-8 pt-2 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary font-serif text-xl text-primary-foreground">
            {name.charAt(0)}
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">Administratrice</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4" strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <LogOut className="size-4" strokeWidth={1.6} />
        Déconnexion
      </button>
    </aside>
  );
}
