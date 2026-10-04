import { Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { ContactLink } from "@/components/site/contact-link";
import { OrderStatus } from "@/components/track/order-status";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { localize } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { getOrderByToken } from "@/lib/orders/service";
import { formatPhone } from "@/lib/phone";

// Always fresh, never cached, never indexed: the URL is the key to the order.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/track/[token]">): Promise<Metadata> {
  const { token } = await params;
  const [order, t] = await Promise.all([getOrderByToken(token), getTranslations("Track")]);
  return {
    title: order ? t("metaTitle", { number: order.order_number }) : undefined,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function TrackPage({ params }: PageProps<"/[locale]/track/[token]">) {
  const { token, locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  const [t, tc, spice, format, brand] = await Promise.all([
    getTranslations("Track"),
    getTranslations("Checkout"),
    getTranslations("Spice"),
    getFormatter(),
    getBrand(),
  ]);
  const branchName = localize(order.branches.name_i18n, locale);
  const when = order.scheduled_for
    ? t("scheduledFor", {
        when: format.dateTime(new Date(order.scheduled_for), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })
    : t("asap");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-[0.2em] text-secondary uppercase">
          {t("title", { number: order.order_number })}
        </p>
        <h1 className="text-display-lg text-balance text-primary">
          {t("thanks", { name: order.customer_name })}
        </h1>
        <p className="text-muted-foreground">{t("saveLink")}</p>
      </header>

      <OrderStatus
        token={order.public_token}
        type={order.type}
        initialStatus={order.status}
        branchName={branchName}
        rejectionReason={order.rejection_reason}
      />

      <section
        aria-labelledby="details-title"
        className="grid gap-6 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2 sm:p-6"
      >
        <h2 id="details-title" className="sr-only">
          {t("items")}
        </h2>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {order.type === "delivery" ? t("deliveryTo") : t("pickupFrom")}
          </p>
          <p className="font-medium">
            {order.type === "delivery"
              ? [order.delivery_address, order.delivery_landmark, order.delivery_city]
                  .filter(Boolean)
                  .join(", ")
              : `${branchName}, ${order.branches.address_line}, ${order.branches.city}`}
          </p>
          <p className="text-sm text-muted-foreground">{when}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("payment")}</p>
          <p className="font-medium">
            {order.type === "delivery"
              ? t("cod", { amount: formatLKR(order.total_cents) })
              : t("codPickup", { amount: formatLKR(order.total_cents) })}
          </p>
          <ContactLink
            kind="tel"
            value={order.branches.phone}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <Phone aria-hidden className="size-4" />
            {t("callBranch", { branch: branchName })} · {formatPhone(order.branches.phone)}
          </ContactLink>
        </div>

        <div className="space-y-3 sm:col-span-2">
          <h3 className="font-display text-lg text-primary">{t("items")}</h3>
          <ul className="space-y-2 text-sm">
            {order.order_items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium">
                    {item.quantity}× {localize(item.name_i18n, locale)}
                  </span>
                  {(item.options.length > 0 || item.spice_level || item.instructions) && (
                    <span className="block text-xs text-muted-foreground">
                      {[
                        ...item.options.map((o) => localize(o.value, locale)),
                        item.spice_level && spice(item.spice_level),
                        item.instructions && `“${item.instructions}”`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{formatLKR(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt>{tc("subtotal")}</dt>
              <dd>{formatLKR(order.subtotal_cents)}</dd>
            </div>
            {order.discount_cents > 0 && (
              <div className="flex justify-between text-success">
                <dt>{tc("discount", { code: order.promo_codes?.code ?? "" })}</dt>
                <dd>{formatLKR(-order.discount_cents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>{tc("serviceCharge", { percent: brand.charges.serviceChargeBps / 100 })}</dt>
              <dd>{formatLKR(order.service_charge_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{tc("vat", { percent: brand.charges.vatBps / 100 })}</dt>
              <dd>{formatLKR(order.vat_cents)}</dd>
            </div>
            {order.type === "delivery" && (
              <div className="flex justify-between">
                <dt>{tc("deliveryFee")}</dt>
                <dd>
                  {order.delivery_fee_cents === 0
                    ? tc("free")
                    : formatLKR(order.delivery_fee_cents)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>{tc("total")}</dt>
              <dd>{formatLKR(order.total_cents)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Button asChild variant="outline">
        <Link href="/menu">{t("orderAgain")}</Link>
      </Button>
    </div>
  );
}
