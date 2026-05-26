"use client";

import { SessionProvider } from "next-auth/react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { CartProvider } from "@/components/providers/CartProvider";

/**
 * Agrégateur de providers client monté une fois dans le layout racine.
 * Ordre : Session → React Query → Panier (le panier dépend du query client).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <CartProvider>{children}</CartProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
