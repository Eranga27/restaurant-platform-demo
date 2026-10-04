"use client";

import { Check, Copy, CreditCard, Loader2, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { publicEnv } from "@/lib/public-env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type OrderStatusValue =
  | "awaiting_payment"
  | "received"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "rejected"
  | "cancelled";

const DELIVERY_STEPS = [
  "received",
  "accepted",
  "preparing",
  "out_for_delivery",
  "completed",
] as const;
const PICKUP_STEPS = ["received", "accepted", "preparing", "ready", "completed"] as const;

/**
 * Live status timeline. Listens on the order's Realtime broadcast topic
 * (`order:<token>`, sent by a database trigger) and refreshes the page data on
 * each change. Falls back to polling if the live connection drops.
 */
export function OrderStatus({
  token,
  type,
  initialStatus,
  branchName,
  rejectionReason,
  unpaidOnline,
  returningFromPayment,
}: {
  token: string;
  type: "delivery" | "pickup";
  initialStatus: OrderStatusValue;
  branchName: string;
  rejectionReason: string | null;
  /** An online-payment order that hasn't been paid. */
  unpaidOnline: boolean;
  /** Just back from PayHere: its notification may still be on its way. */
  returningFromPayment: boolean;
}) {
  const t = useTranslations("Track");
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatusValue>(initialStatus);
  const [live, setLive] = useState(false);

  // Server re-renders (router.refresh) bring a newer status; keep it.
  const [prevInitial, setPrevInitial] = useState(initialStatus);
  if (initialStatus !== prevInitial) {
    setPrevInitial(initialStatus);
    setStatus(initialStatus);
  }

  useEffect(() => {
    if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`order:${token}`, { config: { private: false } })
      .on("broadcast", { event: "status" }, ({ payload }) => {
        const next = (payload as { status?: OrderStatusValue }).status;
        if (next) setStatus(next);
        router.refresh();
      })
      .subscribe((state) => setLive(state === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [token, router]);

  // Polling fallback while not connected, until the order is finished.
  const finished = status === "completed" || status === "rejected" || status === "cancelled";
  useEffect(() => {
    if (live || finished) return;
    const timer = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(timer);
  }, [live, finished, router]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("copied"));
    } catch {
      // Clipboard blocked: the URL bar still has the link.
    }
  }

  const steps = type === "delivery" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = (steps as readonly string[]).indexOf(status);

  return (
    <section
      aria-labelledby="status-title"
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="status-title" className="font-display text-xl text-primary">
          {t("statusTitle")}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              live ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            <Radio aria-hidden className={cn("size-3.5", live && "animate-pulse")} />
            {live ? t("live") : t("reconnecting")}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Copy data-icon="inline-start" aria-hidden />
            {t("copyLink")}
          </Button>
        </div>
      </div>

      {status === "awaiting_payment" ? (
        returningFromPayment && unpaidOnline ? (
          <div role="status" className="flex items-start gap-3 rounded-xl bg-muted p-4">
            <Loader2 aria-hidden className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
            <span className="space-y-1">
              <span className="block font-semibold">{t("confirmingPayment")}</span>
              <span className="block text-sm text-muted-foreground">
                {t("confirmingPaymentHint")}
              </span>
              <Link
                href={`/pay/${token}`}
                className="inline-block text-sm font-medium text-primary underline underline-offset-2"
              >
                {t("paymentProblem")}
              </Link>
            </span>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl bg-highlight/15 p-4">
            <p className="font-semibold">{t("awaitingPayment")}</p>
            <p className="text-sm text-muted-foreground">{t("awaitingPaymentHint")}</p>
            <Button asChild>
              <Link href={`/pay/${token}`}>
                <CreditCard data-icon="inline-start" aria-hidden />
                {t("completePayment")}
              </Link>
            </Button>
          </div>
        )
      ) : status === "rejected" || status === "cancelled" ? (
        <div role="alert" className="space-y-1 rounded-xl bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">
            {status === "rejected"
              ? t("rejected", { branch: branchName })
              : unpaidOnline
                ? t("cancelledUnpaid")
                : t("cancelled")}
          </p>
          {status === "rejected" && rejectionReason && (
            <p>{t("rejectedReason", { reason: rejectionReason })}</p>
          )}
          <p className="text-sm">{t("rejectedHelp")}</p>
        </div>
      ) : (
        <ol className="space-y-0">
          {steps.map((step, i) => {
            const done = i < currentIndex;
            const current = i === currentIndex;
            return (
              <li
                key={step}
                className="relative flex gap-4 pb-6 last:pb-0"
                aria-current={current ? "step" : undefined}
              >
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5",
                      done ? "bg-success" : "bg-border",
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    done && "border-success bg-success text-success-foreground",
                    current && "border-primary bg-primary text-primary-foreground",
                    !done && !current && "border-border bg-card text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className="pt-1">
                  <span
                    className={cn(
                      "block font-semibold",
                      !done && !current && "text-muted-foreground",
                    )}
                  >
                    {t(`steps.${step}`)}
                  </span>
                  {current && (
                    <span className="block text-sm text-muted-foreground">
                      {t(`stepHints.${step}`, { branch: branchName })}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {status === "awaiting_payment"
          ? t("awaitingPayment")
          : t(`steps.${status === "rejected" || status === "cancelled" ? "received" : status}`)}
      </p>
    </section>
  );
}
