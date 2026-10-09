import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { InquiryForm } from "@/components/events/inquiry-form";
import { PageHeader } from "@/components/site/page-header";
import { SplitWords } from "@/components/site/split-words";
import { UnavailableNotice } from "@/components/site/unavailable-notice";
import type { Locale } from "@/i18n/routing";
import { contactPrefill } from "@/lib/auth/prefill";
import { getBrand } from "@/lib/data/brand";
import { getBranches, localize } from "@/lib/data/catalogue";
import { earliestEventDate, eventsEnabled } from "@/lib/events/service";
import { formatLKR } from "@/lib/money";
import { siteMedia } from "@/config/media";

export const dynamic = "force-dynamic";

/** The kinds of event, for the band under the poster. */
const EVENT_TYPES = ["birthday", "office", "dana", "wedding", "homecoming"] as const;

/** Set menus as stickers, each on a lacquer colour. */
const PACKAGE_TONES = [
  "bg-highlight text-highlight-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-primary text-primary-foreground",
  "bg-foreground text-background",
] as const;

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
    <>
      <PageHeader
        tone="ink"
        title={t("title")}
        intro={t("intro")}
        image={{ src: siteMedia.events }}
        band={EVENT_TYPES.map((type) => t(`types.${type}`))}
      />
      <div className="mx-auto w-full max-w-6xl space-y-20 px-4 pt-24 pb-28 sm:px-6 lg:space-y-28 lg:px-8 lg:pt-32">
        <section aria-labelledby="packages-title">
          <h2 id="packages-title" data-reveal="words" className="text-display-xl text-balance">
            <SplitWords markup={t("packagesTitle").replace(/[<>]/g, "")} />
          </h2>
          <ul className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p, i) => (
              <li
                key={p.id}
                data-reveal
                className={`offer-card relative flex flex-col gap-3 rounded-[1.75rem] p-6 pb-16 shadow-soft ${PACKAGE_TONES[i % PACKAGE_TONES.length]}`}
              >
                <span aria-hidden className="font-poster text-5xl leading-none tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl leading-snug">{p.name}</h3>
                <p className="text-sm text-pretty opacity-85">{p.description}</p>
                <p className="absolute -bottom-3 left-5 -rotate-3 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-soft ring-1 ring-border/70">
                  {p.price}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {enabled ? (
          <section aria-labelledby="enquiry-title" className="space-y-8">
            <h2 id="enquiry-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t("formTitle").replace(/[<>]/g, "")} />
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
    </>
  );
}
