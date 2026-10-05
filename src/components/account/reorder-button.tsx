"use client";

import { RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { reorderAction } from "@/app/[locale]/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { useCart } from "@/lib/cart/store";

/** Puts a past order back in the cart, with today's menu and prices, then opens checkout. */
export function ReorderButton({ orderId }: { orderId: string }) {
  const t = useTranslations("Account");
  const locale = useLocale();
  const router = useRouter();
  const cart = useCart();
  const [busy, setBusy] = useState(false);

  async function reorder() {
    setBusy(true);
    const result = await reorderAction(orderId, locale).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!result.ok || result.lines.length === 0) {
      toast.error(t("reorderFailed"));
      return;
    }
    cart.clear();
    cart.setBranch(result.branchId);
    cart.setType(result.type);
    for (const line of result.lines) cart.add(line);
    if (result.skipped > 0) toast.info(t("reorderSkipped", { count: result.skipped }));
    router.push("/checkout");
  }

  return (
    <Button size="sm" variant="outline" onClick={reorder} disabled={busy}>
      <RotateCcw data-icon="inline-start" aria-hidden />
      {t("reorder")}
    </Button>
  );
}
