import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { InquiryForm } from "@/components/events/inquiry-form";
import { PageHeader } from "@/components/site/page-header";
import { UnavailableNotice } from "@/components/site/unavailable-notice";
import type { Locale } from "@/i18n/routing";
import { contactPrefill } from "@/lib/auth/prefill";
import { getBrand } from "@/lib/data/brand";
import { getBranches, localize } from "@/lib/data/catalogue";
import { earliestEventDate, eventsEnabled } from "@/lib/events/service";
import { formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return {
    title: t("eventsTitle"),
    description: t("eventsDescription", { name: brand.name }),
  };
}

export default async function EventsPage({ params }: PageProps<"/[locale]/events">) {
  const locale = (await params).locale as Locale;
  const [t, nav, brand] = await Promise.all([
    getTranslations("Events"),
    getTranslations("Nav"),
    getBrand(),
  ]);
  const enabled = await eventsEnabled();

  const [branches, contact, nonce] = enabled
    ? await Promise.all([
        getBranches(locale),
        contactPrefill(),
        headers().then((h) => h.get("x-nonce") ?? undefined),
      ])
    : [[], { name: "", phone: "", email: "" }, undefined];

  const packages = brand.events.packages.map((p) => ({
    id: p.id,
    name: localize(p.name, locale),
    description: localize(p.description, locale),
    price:
      p.fromPerGuestCents > 0
        ? t("fromPerGuest", { price: formatLKR(p.fromPerGuestCents) })
        : t("customPrice"),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 pt-14 pb-24 sm:px-6 lg:px-8 lg:pt-24">
      <PageHeader title={t("title")} intro={t("intro")} className="pb-0 lg:pb-0" />

      <section aria-labelledby="packages-title" className="space-y-4">
        <h2 id="packages-title" className="font-display text-2xl text-primary">
          {t("packagesTitle")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p) => (
            <li
              key={p.id}
              data-reveal
              className="space-y-2 rounded-2xl border bg-card p-5 shadow-soft"
            >
              <h3 className="font-display text-lg">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <p className="text-sm font-semibold text-secondary">{p.price}</p>
            </li>
          ))}
        </ul>
      </section>

      {enabled ? (
        <section aria-labelledby="enquiry-title" className="space-y-4">
          <h2 id="enquiry-title" className="font-display text-2xl text-primary">
            {t("formTitle")}
          </h2>
          <InquiryForm
            branches={branches.map((b) => ({ id: b.id, name: b.name }))}
            packages={packages.map((p) => ({ id: p.id, name: p.name }))}
            rules={{
              minGuests: brand.events.minGuests,
              maxGuests: brand.events.maxGuests,
              minNoticeDays: brand.events.minNoticeDays,
              earliestDate: earliestEventDate(brand.events.minNoticeDays),
            }}
            initialContact={contact}
            nonce={nonce}
          />
        </section>
      ) : (
        <UnavailableNotice
          embedded
          title={t("unavailableTitle")}
          body={t("unavailableBody")}
          linkLabel={nav("branches")}
        />
      )}
    </div>
  );
}
