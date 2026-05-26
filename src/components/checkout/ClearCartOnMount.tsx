"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/components/providers/CartProvider";

/**
 * Vide le panier une fois la commande confirmée. Le vidage touche un cookie /
 * Redis : il doit donc passer par une Server Action déclenchée côté client
 * (on ne peut pas écrire de cookie pendant le rendu d'un Server Component).
 */
export function ClearCartOnMount() {
  const { clear } = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void clear();
  }, [clear]);

  return null;
}
