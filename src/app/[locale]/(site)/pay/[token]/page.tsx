import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PayPanel } from "@/components/payments/pay-panel";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { localize } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { getOrderByToken, trackingPath } from "@/lib/orders/service";
import { onlinePaymentsEnabled, payhereConfig } from "@/lib/payments/service";

// Per-request nonce (strict CSP) and live order state: always dynamic.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pay");
  // Default referrer policy on purpose: PayHere checks the Referer's origin
  // against the registered domain. Cross-origin, only the origin is sent.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function PayPage({
  params,
  searchParams,
}: PageProps<"/[locale]/pay/[token]">) {
  const [{ token, locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = rawLocale as Locale;
  const order = await getOrderByToken(token);
  if (!order) notFound();
  // Paid, switched to cash, or cancelled: the tracking page explains which.
  if (order.status !== "awaiting_payment") redirect(trackingPath(order.public_token, locale));

  const [t, brand] = await Promise.all([getTranslations("Pay"), getBrand()]);
  const notice =
    query.payment === "cancelled"
      ? t("cancelledNotice")
      : order.payment_status === "failed"
        ? t("failedNotice")
        : null;
  const sandbox = payhereConfig()?.sandbox ?? false;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-secondary uppercase">
          {t("eyebrow", { number: order.order_number })}
        </p>
        <h1 className="text-display-lg text-balance text-primary">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("intro", { branch: localize(order.branches.name_i18n, locale) })}
        </p>
      </header>

      {notice && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-destructive">
          {notice}
        </p>
      )}

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">{t("amount")}</span>
          <span className="font-display text-3xl text-primary tabular-nums">
            {formatLKR(order.total_cents)}
          </span>
        </div>
        <PayPanel
          token={order.public_token}
          trackHref={trackingPath(order.public_token, locale)}
          onlineAvailable={onlinePaymentsEnabled()}
          cashAvailable={brand.features.cashOnDelivery}
          cashLabel={order.type === "delivery" ? t("payCashDelivery") : t("payCashPickup")}
        />
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          {t("secure")}
        </p>
        {sandbox && (
          <div className="space-y-1 rounded-xl border border-dashed p-4 text-sm">
            <p className="font-semibold">{t("sandboxTitle")}</p>
            <p className="text-muted-foreground">{t("sandboxBody")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
