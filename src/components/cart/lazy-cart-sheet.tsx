"use client";

import dynamic from "next/dynamic";

import { useCart } from "@/lib/cart/store";

import type { CartSettings } from "./cart-sheet";

const CartSheet = dynamic(() => import("./cart-sheet").then((m) => m.CartSheet), { ssr: false });

/** Starts loading the cart drawer early, e.g. when a pointer heads for the cart button. */
export const preloadCartSheet = () => void import("./cart-sheet");

/**
 * The cart drawer, loaded the first time the cart is opened rather than with
 * every page: it isn't needed to show the page, and phones on slow
 * connections get the content sooner.
 */
export function LazyCartSheet({ settings }: { settings: CartSettings }) {
  const wasOpened = useCart((s) => s.wasOpened);
  return wasOpened ? <CartSheet settings={settings} /> : null;
}
