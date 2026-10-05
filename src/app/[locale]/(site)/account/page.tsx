import { Gift } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { AccountShell } from "@/components/account/account-shell";
import { ProfileForm } from "@/components/account/profile-form";
import type { Locale } from "@/i18n/routing";
import { getLoyalty, getProfile, requireCustomer } from "@/lib/account/data";
import { getBrand } from "@/lib/data/brand";
import { formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = (await params).locale as Locale;
  const user = await requireCustomer("/account", locale);
  const [t, format, profile, loyalty, brand] = await Promise.all([
    getTranslations("Account"),
    getFormatter(),
    getProfile(user.id),
    getLoyalty(),
    getBrand(),
  ]);

  return (
    <AccountShell current="overview" name={profile.name || user.name || ""}>
      {brand.features.loyalty && (
        <section
          aria-labelledby="points-title"
          className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="points-title"
                className="flex items-center gap-2 font-display text-xl text-primary"
              >
                <Gift aria-hidden className="size-5" /> {t("pointsTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("pointsRule", {
                  spend: formatLKR(brand.loyalty.pointPerCents),
                  value: formatLKR(brand.loyalty.pointValueCents),
                  share: brand.loyalty.maxRedeemBps / 100,
                })}
              </p>
            </div>
            <p className="text-right">
              <span className="block font-display text-4xl text-primary tabular-nums">
                {loyalty.balance}
              </span>
              <span className="text-sm text-muted-foreground">
                {t("pointsWorth", {
                  value: formatLKR(loyalty.balance * brand.loyalty.pointValueCents),
                })}
              </span>
            </p>
          </div>
          {loyalty.entries.length > 0 ? (
            <ul className="divide-y text-sm">
              {loyalty.entries.map((e, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span>
                    {t(`pointsReason.${e.reason}`, { order: e.orders?.order_number ?? "" })}
                    <span className="block text-xs text-muted-foreground">
                      {format.dateTime(new Date(e.created_at), { dateStyle: "medium" })}
                    </span>
                  </span>
                  <span className={e.points > 0 ? "font-semibold text-success" : "font-semibold"}>
                    {e.points > 0 ? `+${e.points}` : e.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("pointsNone")}</p>
          )}
        </section>
      )}

      <section
        aria-labelledby="profile-title"
        className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft sm:p-6"
      >
        <h2 id="profile-title" className="font-display text-xl text-primary">
          {t("profileTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("profileHelp", { email: user.email ?? "" })}
        </p>
        <ProfileForm initial={profile} />
      </section>
    </AccountShell>
  );
}
