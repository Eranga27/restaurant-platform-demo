"use client";

import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { payOnDeliveryAction, startPaymentAction } from "@/app/[locale]/(site)/pay/[token]/actions";
import { Button } from "@/components/ui/button";

import { submitPaymentForm } from "./submit-payment-form";

type PanelError = "rate-limited" | "attempts-exhausted" | "unavailable" | "unknown";

export function PayPanel({
  token,
  trackHref,
  onlineAvailable,
  cashAvailable,
  cashLabel,
}: {
  token: string;
  trackHref: string;
  onlineAvailable: boolean;
  cashAvailable: boolean;
  cashLabel: string;
}) {
  const t = useTranslations("Pay");
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cash" | null>(null);
  const [error, setError] = useState<PanelError | null>(null);

  async function pay() {
    setBusy("pay");
    setError(null);
    const result = await startPaymentAction(token).catch(() => ({
      ok: false as const,
      error: "unknown" as const,
    }));
    if (result.ok) return submitPaymentForm(result.payment); // stays busy while the browser leaves
    if (result.error === "not-needed") return router.push(trackHref);
    setBusy(null);
    setError(result.error);
  }

  async function payCash() {
    setBusy("cash");
    setError(null);
    const result = await payOnDeliveryAction(token).catch(() => ({ ok: false }));
    if (result.ok) return router.push(trackHref);
    setBusy(null);
    setError("error" in result && result.error === "rate-limited" ? "rate-limited" : "unknown");
  }

  return (
    <div className="space-y-3">
      {onlineAvailable ? (
        <Button type="button" size="lg" className="w-full" disabled={busy !== null} onClick={pay}>
          {busy === "pay" ? (
            <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
          ) : (
            <CreditCard data-icon="inline-start" aria-hidden />
          )}
          {busy === "pay" ? t("redirecting") : t("payNow")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("onlineUnavailable")}</p>
      )}
      {cashAvailable && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full"
          disabled={busy !== null}
          onClick={payCash}
        >
          {busy === "cash" ? (
            <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
          ) : (
            <Banknote data-icon="inline-start" aria-hidden />
          )}
          {cashLabel}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
