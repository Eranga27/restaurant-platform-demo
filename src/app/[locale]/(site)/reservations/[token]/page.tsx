import { Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { CancelBooking } from "@/components/reservations/cancel-booking";
import { ContactLink } from "@/components/site/contact-link";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatPhone } from "@/lib/phone";
import { getReservationByToken } from "@/lib/reservations/service";

// The URL is the key to the booking: always fresh, never indexed, never sent on.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/reservations/[token]">): Promise<Metadata> {
  const { token } = await params;
  const [booking, t] = await Promise.all([
    getReservationByToken(token),
    getTranslations("Reservation"),
  ]);
  return {
    title: booking ? t("metaTitle", { reference: booking.reference }) : undefined,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function ReservationPage({
  params,
}: PageProps<"/[locale]/reservations/[token]">) {
  const { token, locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const booking = await getReservationByToken(token);
  if (!booking) notFound();

  const [t, tr, format, branches, brand] = await Promise.all([
    getTranslations("Reservation"),
    getTranslations("Reservations"),
    getFormatter(),
    getBranches(locale),
    getBrand(),
  ]);
  const branch = branches.find((b) => b.id === booking.branch_id);
  const when = format.dateTime(new Date(booking.starts_at), {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  });
  const seating = {
    any: tr("seatingAny"),
    indoor: tr("seatingIndoor"),
    outdoor: tr("seatingOutdoor"),
  }[booking.seating];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <header className="space-y-2">
        <p className="font-mono text-[0.7rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {t("eyebrow", { reference: booking.reference })}
        </p>
        <h1 className="text-display-xl text-balance">
          {t(`titles.${booking.status}`, { name: booking.guest_name })}
        </h1>
        {booking.status === "confirmed" && <p className="text-muted-foreground">{t("saveLink")}</p>}
        {booking.status === "cancelled" &&
          booking.cancelled_by === "branch" &&
          booking.cancel_reason && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-destructive">
              {t("cancelledByBranch", { reason: booking.cancel_reason })}
            </p>
          )}
      </header>

      <dl className="grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2 sm:p-6">
        <div>
          <dt className="text-sm text-muted-foreground">{t("when")}</dt>
          <dd className="font-medium">{when}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("guests")}</dt>
          <dd className="font-medium">{tr("guestCount", { count: booking.party_size })}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-muted-foreground">{t("where")}</dt>
          <dd className="font-medium">
            {branch ? `${branch.name}, ${branch.addressLine}, ${branch.city}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("seating")}</dt>
          <dd className="font-medium">{seating}</dd>
        </div>
        {booking.occasion && (
          <div>
            <dt className="text-sm text-muted-foreground">{t("occasion")}</dt>
            <dd className="font-medium">{tr(`occasions.${booking.occasion}`)}</dd>
          </div>
        )}
        {booking.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">{t("notes")}</dt>
            <dd>{booking.notes}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {booking.canCancel && (
          <CancelBooking token={booking.public_token} when={when} partySize={booking.party_size} />
        )}
        {branch && (
          <ContactLink
            kind="tel"
            value={branch.phone}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <Phone aria-hidden className="size-4" />
            {t("callBranch", { branch: branch.name })} · {formatPhone(branch.phone)}
          </ContactLink>
        )}
        <Button asChild variant="ghost">
          <Link href="/reservations">{t("bookAnother")}</Link>
        </Button>
      </div>
      {booking.status === "confirmed" && !booking.canCancel && (
        <p className="text-sm text-muted-foreground">
          {t("cancelTooLate", { hours: Math.round(brand.reservations.cancelUntilMinutes / 60) })}
        </p>
      )}
    </div>
  );
}
