"use client";

import { useEffect } from "react";

import { useCart } from "@/lib/cart/store";

/** Loads the saved cart after the first render (see src/lib/cart/store.ts). */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return null;
}
