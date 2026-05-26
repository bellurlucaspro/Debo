"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const SORTS = [
  { value: "newest", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "name-asc", label: "Alphabétique" },
];

type Category = { name: string; slug: string };

export function ShopFilters({
  categories,
  activeCategory,
  activeSort,
  activeSearch,
}: {
  categories: Category[];
  activeCategory?: string;
  activeSort?: string;
  activeSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(activeSearch ?? "");

  const setParam = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setParam("search", search.trim() || undefined);
  }

  const tabs = [{ name: "Tout", slug: undefined as string | undefined }, ...categories];

  return (
    <div className="flex flex-col gap-6 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
      {/* Catégories — onglets avec soulignage actif */}
      <nav className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {tabs.map((c) => {
          const active = activeCategory === c.slug || (!activeCategory && !c.slug);
          return (
            <button
              key={c.slug ?? "all"}
              onClick={() => setParam("category", c.slug)}
              className={cn(
                "relative pb-1.5 text-[11px] uppercase tracking-luxe transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c.name}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Recherche + tri — encadrés */}
      <div className="flex flex-wrap items-center gap-3">
        <form
          onSubmit={onSearchSubmit}
          className="flex items-center gap-2 border border-border px-3 py-2 transition-colors focus-within:border-foreground"
        >
          <Search className="size-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une création"
            className="w-32 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>

        <div className="relative flex items-center gap-2 border border-border px-3 py-2">
          <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
            Trier
          </span>
          <select
            value={activeSort ?? "newest"}
            onChange={(e) => setParam("sort", e.target.value)}
            aria-label="Trier les créations"
            className="cursor-pointer appearance-none bg-transparent pr-5 text-sm text-foreground outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 size-3.5 text-muted-foreground"
            strokeWidth={1.6}
          />
        </div>
      </div>
    </div>
  );
}
