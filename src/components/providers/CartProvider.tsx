"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "@/server/actions/cart";
import { EMPTY_CART, type CartView } from "@/types/cart";

const CART_KEY = ["cart"] as const;

type CartContextValue = {
  cart: CartView;
  isLoading: boolean;
  isMutating: boolean;
  pendingVariantId: string | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: CART_KEY,
    queryFn: () => getCart(),
    initialData: EMPTY_CART,
  });

  const apply = useCallback(
    (next: CartView) => queryClient.setQueryData(CART_KEY, next),
    [queryClient]
  );

  const addMutation = useMutation({
    mutationFn: ({
      variantId,
      quantity,
    }: {
      variantId: string;
      quantity: number;
    }) => addToCart({ variantId, quantity }),
    onSuccess: apply,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      variantId,
      quantity,
    }: {
      variantId: string;
      quantity: number;
    }) => updateCartItem({ variantId, quantity }),
    onSuccess: apply,
  });

  const removeMutation = useMutation({
    mutationFn: (variantId: string) => removeFromCart(variantId),
    onSuccess: apply,
  });

  const clearMutation = useMutation({
    mutationFn: () => clearCart(),
    onSuccess: apply,
  });

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const addItem = useCallback(
    async (variantId: string, quantity = 1) => {
      setPendingVariantId(variantId);
      try {
        await addMutation.mutateAsync({ variantId, quantity });
        setIsOpen(true); // révèle le tiroir après ajout
      } finally {
        setPendingVariantId(null);
      }
    },
    [addMutation]
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      setPendingVariantId(variantId);
      try {
        await updateMutation.mutateAsync({ variantId, quantity });
      } finally {
        setPendingVariantId(null);
      }
    },
    [updateMutation]
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      setPendingVariantId(variantId);
      try {
        await removeMutation.mutateAsync(variantId);
      } finally {
        setPendingVariantId(null);
      }
    },
    [removeMutation]
  );

  const clear = useCallback(async () => {
    await clearMutation.mutateAsync();
  }, [clearMutation]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart: data ?? EMPTY_CART,
      isLoading,
      isMutating:
        addMutation.isPending ||
        updateMutation.isPending ||
        removeMutation.isPending ||
        clearMutation.isPending,
      pendingVariantId,
      isOpen,
      open,
      close,
      toggle,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [
      data,
      isLoading,
      addMutation.isPending,
      updateMutation.isPending,
      removeMutation.isPending,
      clearMutation.isPending,
      pendingVariantId,
      isOpen,
      open,
      close,
      toggle,
      addItem,
      setQuantity,
      removeItem,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart doit être utilisé à l'intérieur de <CartProvider>");
  }
  return ctx;
}
