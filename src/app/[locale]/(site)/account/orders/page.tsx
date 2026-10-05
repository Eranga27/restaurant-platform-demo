import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { AccountShell } from "@/components/account/account-shell";
import { ReorderButton } from "@/components/account/reorder-button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMyOrders, getProfile, requireCustomer } from "@/lib/account/data";
import { getBranches } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("tabs.orders"), robots: { index: false, follow: false } };
}

export default async function AccountOrdersPage({ params }: PageProps<"/[locale]/account/orders">) {
  const locale = (await params).locale as Locale;
  const user = await requireCustomer("/account/orders", locale);
  const [t, ts, format, orders, branches, profile] = await Promise.all([
    getTranslations("Account"),
    getTranslations("Track"),
    getFormatter(),
    getMyOrders(user.id),
    getBranches(locale),
    getProfile(user.id),
  ]);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "";

  return (
    <AccountShell current="orders" name={profile.name || user.name || ""}>
      {orders.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("noOrders")}</p>
          <Link href="/menu" className="font-medium text-primary underline">
            {t("browseMenu")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const items = o.order_items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">
                    {format.dateTime(new Date(o.created_at), { dateStyle: "medium" })} ·{" "}
                    {branchName(o.branch_id)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("orderSummary", { number: o.order_number, items })} ·{" "}
                    {formatLKR(o.total_cents)}
                  </p>
                </div>
                <Badge variant="outline">
                  {o.status === "awaiting_payment"
                    ? ts("awaitingPayment")
                    : o.status === "rejected" || o.status === "cancelled"
                      ? t(`status.${o.status}`)
                      : ts(`steps.${o.status}`)}
                </Badge>
                <div className="flex gap-2">
                  <Link
                    href={`/track/${o.public_token}`}
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t("viewOrder")}
                  </Link>
                  <ReorderButton orderId={o.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
