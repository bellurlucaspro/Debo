/** Vue panier enrichie renvoyée au client (prix recalculés côté serveur). */
export type CartLine = {
  variantId: string;
  productSlug: string;
  name: string;
  image: string | null;
  color: string | null;
  size: string | null;
  unitPrice: number; // minor units (centimes)
  quantity: number;
  lineTotal: number; // unitPrice * quantity
  inventory: number; // stock disponible (pour borner le sélecteur)
};

export type CartView = {
  lines: CartLine[];
  subtotal: number; // somme des lineTotal
  count: number; // nombre total d'articles
  currency: string;
};

export const EMPTY_CART: CartView = {
  lines: [],
  subtotal: 0,
  count: 0,
  currency: "EUR",
};
