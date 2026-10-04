"use client";

import { useCart } from "@/lib/cart/store";

/**
 * The branch the visitor is ordering from, kept in the cart. Falls back to the
 * first branch before the cart has loaded or when the saved one is gone.
 */
export function useSelectedBranch(branchIds: string[]): [string, (id: string) => void] {
  const saved = useCart((s) => s.branchId);
  const setBranch = useCart((s) => s.setBranch);
  const current = saved && branchIds.includes(saved) ? saved : (branchIds[0] ?? "");
  return [current, setBranch];
}
