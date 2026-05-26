"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingBag, User2, Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";

import { useCart } from "@/components/providers/CartProvider";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { cn } from "@/lib/utils";

const SHOP_CATS = [
  { href: "/shop", label: "Toutes les créations" },
  { href: "/shop?category=perles-facettees", label: "Perles facettées" },
  { href: "/shop?category=pierres-precieuses", label: "Pierres précieuses" },
  { href: "/shop?category=pieces-disponibles", label: "Pièces disponibles" },
  { href: "/shop?category=haute-joaillerie", label: "Haute joaillerie" },
];

type NavItem = { href: string; label: string; children?: { href: string; label: string }[] };

const NAV: NavItem[] = [
  { href: "/", label: "Accueil" },
  { href: "/shop", label: "Boutique", children: SHOP_CATS },
  { href: "/sur-mesure", label: "Sur-mesure" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { data: session } = useSession();
  const { cart, toggle } = useCart();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[70] transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="section-shell grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4 md:h-24">
          {/* Gauche — logo + hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              className="-ml-1 grid size-10 place-items-center text-foreground transition-opacity hover:opacity-60 md:hidden"
            >
              <Menu className="size-5" strokeWidth={1.4} />
            </button>
            <Link
              href="/"
              aria-label="DEBO — Accueil"
              className="font-serif text-2xl font-light tracking-[0.3em] text-foreground md:text-[1.7rem]"
            >
              DEBO
            </Link>
          </div>

          {/* Centre — navigation (desktop) */}
          <nav className="hidden items-center md:flex">
            {NAV.map((item, i) => (
              <div key={item.label} className="flex items-center">
                {i > 0 && <span className="mx-4 h-3.5 w-px bg-primary/60" />}

                {item.children ? (
                  <div className="group relative">
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-1 text-[13px] tracking-wide transition-colors hover:text-foreground",
                        isActive(item.href)
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className="size-3.5 transition-transform duration-300 group-hover:rotate-180"
                        strokeWidth={1.6}
                      />
                    </Link>

                    {/* Panneau déroulant (hover / focus) */}
                    <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-4 opacity-0 transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      <div className="min-w-60 border border-border bg-popover p-2 shadow-[0_24px_60px_-28px_hsl(var(--foreground)/0.45)]">
                        {item.children.map((c) => (
                          <Link
                            key={c.label}
                            href={c.href}
                            className="block px-4 py-2.5 text-[11px] uppercase tracking-luxe text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "text-[13px] tracking-wide transition-colors hover:text-foreground",
                      isActive(item.href)
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Droite — actions */}
          <div className="flex items-center justify-end gap-2 md:gap-3">
            <ThemeToggle className="hidden sm:grid" />

            <Link
              href={session?.user ? "/account" : "/login"}
              aria-label={session?.user ? "Mon compte" : "Se connecter"}
              className="hidden size-10 place-items-center rounded-full text-foreground/70 transition-colors hover:text-foreground sm:grid"
            >
              <User2 className="size-[1.05rem]" strokeWidth={1.4} />
            </Link>

            <button
              onClick={toggle}
              aria-label={`Panier (${cart.count} article${cart.count > 1 ? "s" : ""})`}
              className="relative grid size-10 place-items-center rounded-full text-foreground transition-opacity hover:opacity-60"
            >
              <ShoppingBag className="size-[1.05rem]" strokeWidth={1.4} />
              {cart.count > 0 && (
                <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium tabular-nums text-primary-foreground">
                  {cart.count}
                </span>
              )}
            </button>

            {/* CTA — ruby plein, angles droits, boîte flèche inversée */}
            <Link
              href="/contact"
              className="group ml-1 hidden items-center gap-3 bg-primary py-2.5 pl-5 pr-2.5 text-[12px] font-medium uppercase tracking-luxe text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex"
            >
              Devis gratuit
              <span className="grid size-7 place-items-center bg-primary-foreground text-primary transition-transform group-hover:translate-x-0.5">
                <ArrowUpRight className="size-4" strokeWidth={1.7} />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Menu plein écran (mobile) */}
      <div
        className={cn(
          "fixed inset-0 z-[75] flex flex-col bg-background transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <span className="font-serif text-2xl font-light tracking-[0.3em] text-foreground">
            DEBO
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Fermer le menu"
              className="grid size-10 place-items-center text-foreground transition-opacity hover:opacity-60"
            >
              <X className="size-5" strokeWidth={1.4} />
            </button>
          </div>
        </div>

        <nav className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto px-6 py-6">
          {NAV.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "border-b border-border/60 transition-all duration-700",
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )}
              style={{ transitionDelay: menuOpen ? `${120 + i * 70}ms` : "0ms" }}
            >
              <Link href={item.href} className="block py-5 font-serif text-3xl text-foreground">
                {item.label}
              </Link>
              {item.children && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 pb-5">
                  {item.children.slice(1).map((c) => (
                    <Link
                      key={c.label}
                      href={c.href}
                      className="text-[11px] uppercase tracking-luxe text-muted-foreground"
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="px-6 py-8">
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2.5 bg-primary py-4 text-[12px] font-medium uppercase tracking-luxe text-primary-foreground"
          >
            Devis gratuit
            <ArrowUpRight className="size-4" strokeWidth={1.7} />
          </Link>
        </div>
      </div>
    </>
  );
}
