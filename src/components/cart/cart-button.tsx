"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cartCount, useCart } from "@/lib/cart/store";

import { preloadCartSheet } from "./lazy-cart-sheet";

/** The header's cart button, with the item count. Kept apart from the drawer so the drawer can load later. */
export function CartButton() {
  const t = useTranslations("Nav");
  const count = useCart((s) => cartCount(s.lines));
  const setOpen = useCart((s) => s.setOpen);
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative bg-card"
      onClick={() => setOpen(true)}
      onPointerEnter={preloadCartSheet}
      onFocus={preloadCartSheet}
      aria-label={t("cartCount", { count })}
    >
      <ShoppingBag aria-hidden />
      {count > 0 && (
        // Keyed by the count, so it pops each time something is added.
        <span
          key={count}
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-highlight px-1 text-xs font-bold text-highlight-foreground tabular-nums"
        >
          {count}
        </span>
      )}
    </Button>
  );
}
