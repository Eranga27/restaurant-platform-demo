"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { cartCount, cartSubtotal, useCart, useCartHydrated } from "@/lib/cart/store";
import { formatLKR } from "@/lib/money";

/**
 * On phones, a bar pinned to the bottom of the menu once something is in the
 * order: the count, the food total and a way into the cart. The header's cart
 * button does the same on larger screens.
 */
export function CartBar() {
  const t = useTranslations("Cart");
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const count = cartCount(lines);
  if (!hydrated || count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full animate-in items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-left text-primary-foreground shadow-lifted duration-300 slide-in-from-bottom-4 active:scale-[0.99]"
      >
        <span className="relative flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
          <ShoppingBag aria-hidden className="size-5" />
          <span
            key={count}
            aria-hidden
            className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-highlight px-1 text-xs font-bold text-highlight-foreground tabular-nums"
          >
            {count}
          </span>
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{t("viewOrder")}</span>
          <span className="block text-sm text-primary-foreground/80">
            {t("barItems", { count })}
          </span>
        </span>
        <span className="font-semibold tabular-nums">{formatLKR(cartSubtotal(lines))}</span>
      </button>
    </div>
  );
}
