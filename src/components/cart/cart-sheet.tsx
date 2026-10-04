"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { DishImage } from "@/components/site/dish-image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { cartCount, cartSubtotal, MAX_LINE_QUANTITY, useCart } from "@/lib/cart/store";
import { formatLKR } from "@/lib/money";

export type CartSettings = {
  minimumOrderCents: number;
  serviceChargePercent: number;
  branchNames: Record<string, string>;
};

export function CartSheet({ settings }: { settings: CartSettings }) {
  const t = useTranslations("Cart");
  const tc = useTranslations("Common");
  const { lines, isOpen, setOpen, setQuantity, remove, branchId, type } = useCart();
  const subtotal = cartSubtotal(lines);
  const branchName = branchId ? settings.branchNames[branchId] : undefined;
  const missing = settings.minimumOrderCents - subtotal;

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        closeLabel={tc("close")}
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-2xl text-primary">{t("title")}</SheetTitle>
          <SheetDescription>
            {branchName ? t("from", { branch: branchName }) : t("emptyBody")}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag aria-hidden className="size-10 text-muted-foreground" />
            <p className="font-display text-xl">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/menu">{t("browseMenu")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-4">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                    <DishImage src={line.imageUrl} alt="" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="leading-snug font-medium">{line.name}</p>
                    {line.details.length > 0 && (
                      <p className="text-xs text-muted-foreground">{line.details.join(" · ")}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div
                        className="flex items-center rounded-lg border"
                        role="group"
                        aria-label={t("quantity", { name: line.name })}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            line.quantity === 1
                              ? t("remove", { name: line.name })
                              : t("decrease", { name: line.name })
                          }
                          onClick={() =>
                            line.quantity === 1
                              ? remove(line.key)
                              : setQuantity(line.key, line.quantity - 1)
                          }
                        >
                          {line.quantity === 1 ? <Trash2 aria-hidden /> : <Minus aria-hidden />}
                        </Button>
                        <output className="w-7 text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </output>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={line.quantity >= MAX_LINE_QUANTITY}
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          aria-label={t("increase", { name: line.name })}
                        >
                          <Plus aria-hidden />
                        </Button>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
                        {formatLKR(line.unitPriceCents * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <SheetFooter className="gap-3 border-t bg-background">
              <div className="flex items-center justify-between text-base font-semibold">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">{formatLKR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("chargesNote", { serviceCharge: settings.serviceChargePercent })}
              </p>
              {type === "delivery" && missing > 0 && (
                <p role="status" className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
                  {t("minimumNote", {
                    amount: formatLKR(settings.minimumOrderCents),
                    missing: formatLKR(missing),
                  })}
                </p>
              )}
              <Button asChild size="lg" onClick={() => setOpen(false)}>
                <Link href="/checkout">
                  {t("checkout")} · {cartCount(lines)}
                </Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

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
      aria-label={t("cartCount", { count })}
    >
      <ShoppingBag aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight px-1 text-xs font-bold text-highlight-foreground tabular-nums"
        >
          {count}
        </span>
      )}
    </Button>
  );
}
