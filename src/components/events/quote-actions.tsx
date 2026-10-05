"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { respondToQuoteAction, startDepositAction } from "@/app/[locale]/(site)/events/actions";
import { submitPaymentForm } from "@/components/payments/submit-payment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Accept or decline a quote, or pay its deposit through PayHere. */
export function QuoteActions({
  token,
  mode,
  depositLabel,
}: {
  token: string;
  mode: "respond" | "deposit";
  depositLabel: string;
}) {
  const t = useTranslations("EventStatus");
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | "deposit" | null>(null);
  const [declining, setDeclining] = useState(false);

  async function respond(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    const result = await respondToQuoteAction(token, accept).catch(() => ({ ok: false }));
    setBusy(null);
    setDeclining(false);
    if (!result.ok) toast.error(t("errors.unknown"));
    router.refresh();
  }

  async function payDeposit() {
    setBusy("deposit");
    const result = await startDepositAction(token).catch(() => ({
      ok: false as const,
      error: "unknown" as const,
    }));
    if (result.ok) return submitPaymentForm(result.payment); // stays busy while the browser leaves
    setBusy(null);
    toast.error(t(`errors.${result.error}`));
    if (result.error === "not-needed") router.refresh();
  }

  if (mode === "deposit") {
    return (
      <Button size="lg" className="w-full sm:w-auto" disabled={busy !== null} onClick={payDeposit}>
        {busy === "deposit" ? (
          <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
        ) : (
          <CreditCard data-icon="inline-start" aria-hidden />
        )}
        {busy === "deposit" ? t("redirecting") : depositLabel}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="lg" disabled={busy !== null} onClick={() => respond(true)}>
        {busy === "accept" && (
          <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
        )}
        {t("accept")}
      </Button>
      <Dialog open={declining} onOpenChange={setDeclining}>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" disabled={busy !== null}>
            {t("decline")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("declineTitle")}</DialogTitle>
            <DialogDescription>{t("declineBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(false)}>
              {t("keep")}
            </Button>
            <Button variant="destructive" disabled={busy !== null} onClick={() => respond(false)}>
              {t("decline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
