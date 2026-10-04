"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CartLineInput } from "@/lib/orders/schema";

/**
 * The cart, saved in localStorage. It holds only what the server needs to
 * re-price the order (item and option IDs, quantities) plus display snapshots;
 * the server never trusts the snapshot prices (docs/SECURITY.md).
 *
 * Persistence is rehydrated after mount (CartHydrator), so server-rendered HTML
 * and the first client render always agree on an empty cart.
 */

export type CartLine = CartLineInput & {
  /** Stable key for React and updates. */
  key: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Human-readable choices, e.g. ["Large", "Extra cheese"]. */
  details: string[];
  /** Display only; the server re-prices at checkout. */
  unitPriceCents: number;
};

type CartState = {
  branchId: string | null;
  type: "delivery" | "pickup";
  lines: CartLine[];
  promoCode: string | null;
  isOpen: boolean;
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setBranch: (branchId: string) => void;
  setType: (type: "delivery" | "pickup") => void;
  setPromoCode: (code: string | null) => void;
  setOpen: (open: boolean) => void;
};

/** Lines with the same item, choices and notes are merged. */
function sameConfiguration(a: CartLineInput, b: CartLineInput): boolean {
  const normalize = (s: CartLineInput["selection"]) =>
    JSON.stringify(
      Object.keys(s)
        .sort()
        .map((k) => [k, [...(s[k] ?? [])].sort()]),
    );
  return (
    a.menuItemId === b.menuItemId &&
    normalize(a.selection) === normalize(b.selection) &&
    a.spiceLevel === b.spiceLevel &&
    (a.instructions ?? "") === (b.instructions ?? "")
  );
}

export const MAX_LINE_QUANTITY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      branchId: null,
      type: "delivery",
      lines: [],
      promoCode: null,
      isOpen: false,
      add: (line) =>
        set((state) => {
          const existing = state.lines.find((l) => sameConfiguration(l, line));
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === existing.key
                  ? { ...l, quantity: Math.min(MAX_LINE_QUANTITY, l.quantity + line.quantity) }
                  : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key: crypto.randomUUID() }] };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.key === key
              ? { ...l, quantity: Math.max(1, Math.min(MAX_LINE_QUANTITY, quantity)) }
              : l,
          ),
        })),
      remove: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [], promoCode: null }),
      setBranch: (branchId) => set({ branchId }),
      setType: (type) => set({ type }),
      setPromoCode: (promoCode) => set({ promoCode }),
      setOpen: (isOpen) => set({ isOpen }),
    }),
    {
      name: "kithul.cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ branchId, type, lines, promoCode }) => ({ branchId, type, lines, promoCode }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) =>
  lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);

const subscribeHydration = (callback: () => void) => useCart.persist.onFinishHydration(callback);

/** False until the saved cart has loaded (avoids flashing "your order is empty"). */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}
