import { Armchair, Bike, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BranchMapLoader } from "@/components/branches/branch-map-loader";
import { ContactLink } from "@/components/site/contact-link";
import { OpenStatus } from "@/components/site/open-status";
import { PageHeader } from "@/components/site/page-header";
import { Splash } from "@/components/site/splash";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatTime, groupHours } from "@/lib/hours";
import { formatPhone } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/branches">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/branches",
    title: t("branchesTitle"),
    description: t("branchesDescription", { name: brand.name }),
  });
}

export default async function BranchesPage({ params }: PageProps<"/[locale]/branches">) {
  const locale = (await params).locale as Locale;
  const [t, branches] = await Promise.all([getTranslations("Branches"), getBranches(locale)]);

  return (
    <>
      <Splash />
      <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-20 sm:px-6 lg:px-8 lg:pt-24">
        <PageHeader title={t("title")} intro={t("subtitle")} />

        <div className="mb-10 h-72 overflow-hidden rounded-3xl border shadow-soft sm:h-96">
          <BranchMapLoader
            label={t("mapLabel")}
            branches={branches.map((b) => ({
              id: b.id,
              name: b.name,
              address: `${b.addressLine}, ${b.city}`,
              lat: b.lat,
              lng: b.lng,
            }))}
          />
        </div>

        <ul className="grid gap-6 lg:grid-cols-3">
          {branches.map((branch) => (
            <li
              key={branch.id}
              id={branch.slug}
              data-reveal
              className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border bg-card p-6 shadow-soft"
            >
              <div className="space-y-2">
                <h2 className="font-display text-2xl text-primary">{branch.name}</h2>
                <OpenStatus hours={branch.openingHours} />
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {branch.addressLine}, {branch.city}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Bike aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    {branch.isAcceptingOrders
                      ? t("delivery", { km: branch.deliveryRadiusKm })
                      : t("notTakingOrders")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Armchair aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{t("seats", { count: branch.seatingCapacity })}</span>
                </li>
              </ul>

              <div>
                <h3 className="mb-2 text-sm font-semibold">{t("hours")}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {groupHours(branch.openingHours).map((group) => (
                    <div key={group.from} className="contents">
                      <dt className="text-muted-foreground">
                        {group.from === group.to
                          ? t(`daysShort.${group.from}`)
                          : `${t(`daysShort.${group.from}`)} – ${t(`daysShort.${group.to}`)}`}
                      </dt>
                      <dd className="tabular-nums">
                        {group.ranges.length === 0
                          ? t("closedAllDay")
                          : group.ranges
                              .map(
                                ([open, close]) =>
                                  `${formatTime(open, locale)} – ${formatTime(close, locale)}`,
                              )
                              .join(", ")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation data-icon="inline-start" aria-hidden />
                    {t("directions")}
                  </a>
                </Button>
                <ContactLink
                  kind="tel"
                  value={branch.phone}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[0.8rem] font-medium"
                >
                  <Phone aria-hidden className="size-3.5" />
                  {formatPhone(branch.phone)}
                </ContactLink>
                {branch.whatsapp && (
                  <ContactLink
                    kind="whatsapp"
                    value={branch.whatsapp}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[0.8rem] font-medium"
                  >
                    <MessageCircle aria-hidden className="size-3.5" />
                    {t("whatsapp")}
                  </ContactLink>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
