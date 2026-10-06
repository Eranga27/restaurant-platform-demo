import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { BookingForm } from "@/components/reservations/booking-form";
import { PageHeader } from "@/components/site/page-header";
import { UnavailableNotice } from "@/components/site/unavailable-notice";
import type { Locale } from "@/i18n/routing";
import { contactPrefill } from "@/lib/auth/prefill";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { reservationsEnabled } from "@/lib/reservations/service";
import { bookableDates } from "@/lib/reservations/slots";

// Per-request nonce (strict CSP), today's dates and the signed-in user.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return {
    title: t("reservationsTitle"),
    description: t("reservationsDescription", { name: brand.name }),
  };
}

export default async function ReservationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/reservations">) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale = rawLocale as Locale;
  const [t, nav] = await Promise.all([getTranslations("Reservations"), getTranslations("Nav")]);

  if (!(await reservationsEnabled())) {
    return (
      <UnavailableNotice
        title={t("unavailableTitle")}
        body={t("unavailableBody")}
        linkLabel={nav("branches")}
      />
    );
  }

  const [brand, branches, contact, nonce] = await Promise.all([
    getBrand(),
    getBranches(locale),
    contactPrefill(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
  ]);
  const wanted = typeof query.branch === "string" ? query.branch : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-14 pb-24 sm:px-6 lg:px-8 lg:pt-24">
      <PageHeader title={t("title")} intro={t("intro")} />
      <BookingForm
        branches={branches.map((b) => ({ id: b.id, slug: b.slug, name: b.name, city: b.city }))}
        initialBranchSlug={wanted}
        dates={bookableDates(new Date(), brand.reservations)}
        maxPartySize={brand.reservations.maxPartySize}
        initialContact={contact}
        nonce={nonce}
      />
    </div>
  );
}
