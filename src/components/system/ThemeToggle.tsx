"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bascule clair / sombre. Manipule la classe `.dark` sur <html> et persiste le
 * choix (localStorage). L'état initial est posé avant l'hydratation par le
 * script inline du layout (pas de flash). Icône neutre tant que non monté pour
 * éviter tout mismatch d'hydratation.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("debo-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Basculer entre le thème clair et sombre"
      className={cn(
        "grid size-10 place-items-center rounded-full border border-border text-foreground/70 transition-colors hover:border-foreground/40 hover:text-foreground",
        className
      )}
    >
      {mounted && dark ? (
        <Sun className="size-[1.05rem]" strokeWidth={1.4} />
      ) : (
        <Moon className="size-[1.05rem]" strokeWidth={1.4} />
      )}
    </button>
  );
}
