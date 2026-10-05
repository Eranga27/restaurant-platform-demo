"use client";

import { AlertTriangle, Loader2, Tag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import type { QuoteView } from "@/app/[locale]/(site)/checkout/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { CartLine } from "@/lib/cart/store";
import { formatTime } from "@/lib/hours";
import { formatLKR } from "@/lib/money";
import type { QuoteIssue } from "@/lib/orders/quote";

type OrderSummaryProps = {
  lines: CartLine[];
  quote: QuoteView | null;
  loading: boolean;
  branchName: string;
  type: "delivery" | "pickup";
  charges: { serviceChargePercent: number; vatPercent: number };
  promoCode: string | null;
  onPromoChange: (code: string | null) => void;
  onRemoveLine: (key: string) => void;
  submitError: string | null;
  paymentMethod: "cod" | "payhere";
  placing: boolean;
  canPlace: boolean;
  turnstile: ReactNode;
  waitingForTurnstile: boolean;
};

const PROMO_ISSUES = new Set(["promo-invalid", "promo-expired", "promo-min-spend"]);

export function OrderSummary(props: OrderSummaryProps) {
  const {
    lines,
    quote,
    loading,
    branchName,
    type,
    charges,
    promoCode,
    onPromoChange,
    onRemoveLine,
  } = props;
  const t = useTranslations("Checkout");
  const tb = useTranslations("Branches");
  const locale = useLocale();
  const [promoInput, setPromoInput] = useState(promoCode ?? "");

  function issueText(issue: QuoteIssue): string {
    switch (issue.code) {
      case "branch-closed":
        return issue.opensAt
          ? t("errors.branch-closed-opens", {
              branch: branchName,
              day: tb(`days.${issue.opensAt.day}`),
              time: formatTime(issue.opensAt.time, locale),
            })
          : t("errors.branch-closed", { branch: branchName });
      case "item-unavailable":
      case "item-not-today":
      case "options-invalid":
        return t(`errors.${issue.code}`, { name: lines[issue.lineIndex]?.name ?? "" });
      case "outside-delivery-area":
        return t("errors.outside-delivery-area", {
          km: issue.distanceKm.toFixed(1),
          radius: issue.radiusKm,
        });
      case "below-minimum":
        return t("errors.below-minimum", { amount: formatLKR(issue.minimumCents) });
      case "promo-min-spend":
        return t("errors.promo-min-spend", { amount: formatLKR(issue.minSubtotalCents) });
      default:
        return t(`errors.${issue.code}`);
    }
  }

  const issues = quote?.issues ?? [];
  const orderIssues = issues.filter((i) => !PROMO_ISSUES.has(i.code));
  const promoIssue = issues.find((i) => PROMO_ISSUES.has(i.code));
  const totals = quote?.totals;

  return (
    <aside
      aria-labelledby="summary-title"
      className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6 lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="summary-title" className="font-display text-xl text-primary">
          {t("summaryTitle")}
        </h2>
        <Link
          href="/menu"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("editOrder")}
        </Link>
      </div>

      <ul className="space-y-3 text-sm">
        {lines.map((line, index) => {
          const priced = quote?.lines.find((l) => l.lineIndex === index);
          const lineIssue = issues.find((i) => "lineIndex" in i && i.lineIndex === index);
          return (
            <li key={line.key} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="font-medium">
                  {line.quantity}× {line.name}
                </span>
                {line.details.length > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {line.details.join(" · ")}
                  </span>
                )}
                {lineIssue && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-destructive"
                    onClick={() => onRemoveLine(line.key)}
                  >
                    <X data-icon="inline-start" aria-hidden />
                    {issueText(lineIssue)}
                  </Button>
                )}
              </span>
              <span className="shrink-0 tabular-nums">
                {priced
                  ? formatLKR(priced.lineTotalCents)
                  : formatLKR(line.unitPriceCents * line.quantity)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <label htmlFor="promo" className="flex items-center gap-1.5 text-sm font-medium">
          <Tag aria-hidden className="size-4" />
          {t("promo")}
        </label>
        {promoCode && !promoIssue ? (
          <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <span>{t("promoApplied", { code: promoCode })}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("removePromo")}
              onClick={() => onPromoChange(null)}
            >
              <X aria-hidden />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              id="promo"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={t("promoPlaceholder")}
              autoComplete="off"
              maxLength={20}
              aria-invalid={promoIssue ? true : undefined}
              aria-describedby={promoIssue ? "promo-error" : undefined}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!/^[A-Z0-9]{3,20}$/.test(promoInput.trim())}
              onClick={() => onPromoChange(promoInput.trim())}
            >
              {t("applyPromo")}
            </Button>
          </div>
        )}
        {promoIssue && (
          <p
            id="promo-error"
            className="flex items-center justify-between gap-2 text-sm text-destructive"
          >
            {issueText(promoIssue)}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => onPromoChange(null)}
            >
              {t("removePromo")}
            </Button>
          </p>
        )}
      </div>

      <dl className="space-y-2 border-t pt-4 text-sm tabular-nums" aria-busy={loading}>
        <Row label={t("subtotal")} value={totals ? formatLKR(totals.subtotalCents) : "…"} />
        {totals && totals.discountCents > 0 && (
          <Row
            label={t("discount", { code: quote?.promoCode ?? "" })}
            value={formatLKR(-totals.discountCents)}
            highlight
          />
        )}
        {totals && totals.loyaltyDiscountCents > 0 && (
          <Row
            label={t("loyaltyDiscount", { points: totals.loyaltyPoints })}
            value={formatLKR(-totals.loyaltyDiscountCents)}
            highlight
          />
        )}
        <Row
          label={t("serviceCharge", { percent: charges.serviceChargePercent })}
          value={totals ? formatLKR(totals.serviceChargeCents) : "…"}
        />
        <Row
          label={t("vat", { percent: charges.vatPercent })}
          value={totals ? formatLKR(totals.vatCents) : "…"}
        />
        {type === "delivery" && (
          <Row
            label={t("deliveryFee")}
            value={
              !totals || quote?.distanceKm === null
                ? "…"
                : totals.deliveryFeeCents === 0
                  ? t("free")
                  : formatLKR(totals.deliveryFeeCents)
            }
          />
        )}
        <div className="flex justify-between border-t pt-3 text-base font-semibold">
          <dt>{t("total")}</dt>
          <dd>{totals ? formatLKR(totals.totalCents) : "…"}</dd>
        </div>
      </dl>
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? t("calculating") : totals ? `${t("total")} ${formatLKR(totals.totalCents)}` : ""}
      </p>

      {orderIssues.filter((i) => !("lineIndex" in i)).length > 0 && (
        <ul role="alert" className="space-y-2">
          {orderIssues
            .filter((i) => !("lineIndex" in i))
            .map((issue) => (
              <li
                key={issue.code}
                className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                {issueText(issue)}
              </li>
            ))}
        </ul>
      )}

      {props.turnstile}

      {props.submitError && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {props.submitError === "fixErrors"
            ? t("fixErrors")
            : t(`errors.${props.submitError as "unknown"}`)}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!props.canPlace || props.placing}
      >
        {props.placing ? (
          <>
            <Loader2 data-icon="inline-start" aria-hidden className="animate-spin" />
            {props.paymentMethod === "payhere" ? t("redirectingToPayment") : t("placing")}
          </>
        ) : loading ? (
          t("calculating")
        ) : props.waitingForTurnstile ? (
          t("verifying")
        ) : (
          t(props.paymentMethod === "payhere" ? "placeOrderAndPay" : "placeOrder", {
            total: totals ? formatLKR(totals.totalCents) : "",
          })
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {t.rich("agree", {
          terms: (chunks) => (
            <Link href="/terms" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
          refunds: (chunks) => (
            <Link href="/refunds" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </aside>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "flex justify-between text-success" : "flex justify-between"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
