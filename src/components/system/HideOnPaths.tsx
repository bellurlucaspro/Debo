"use client";

import { usePathname } from "next/navigation";

/**
 * Masque ses enfants sur certains préfixes de route (ex. l'admin et le login
 * ne doivent pas afficher le header/footer/preloader du storefront).
 */
export function HideOnPaths({
  prefixes,
  children,
}: {
  prefixes: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hidden = prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p)
  );
  if (hidden) return null;
  return <>{children}</>;
}
