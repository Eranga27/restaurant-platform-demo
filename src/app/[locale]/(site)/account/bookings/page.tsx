import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";

import { AccountShell } from "@/components/account/account-shell";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getMyBookings, getProfile, requireCustomer } from "@/lib/account/data";
import { getBranches } from "@/lib/data/catalogue";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account");
  return { title: t("tabs.bookings"), robots: { index: false, follow: false } };
}

export default async function AccountBookingsPage({
  params,
}: PageProps<"/[locale]/account/bookings">) {
  const locale = (await params).locale as Locale;
  const user = await requireCustomer("/account/bookings", locale);
  const [t, te, format, bookings, branches, profile] = await Promise.all([
    getTranslations("Account"),
    getTranslations("Events"),
    getFormatter(),
    getMyBookings(user.id),
    getBranches(locale),
    getProfile(user.id),
  ]);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "";
  const nothing = bookings.reservations.length === 0 && bookings.inquiries.length === 0;

  return (
    <AccountShell current="bookings" name={profile.name || user.name || ""}>
      {nothing && (
        <div className="space-y-3 rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("noBookings")}</p>
          <div className="flex justify-center gap-4">
            <Link href="/reservations" className="font-medium text-primary underline">
              {t("bookTable")}
            </Link>
            <Link href="/events" className="font-medium text-primary underline">
              {t("planEvent")}
            </Link>
          </div>
        </div>
      )}
      {bookings.reservations.length > 0 && (
        <section aria-labelledby="tables-title" className="space-y-3">
          <h2 id="tables-title" className="font-display text-xl text-primary">
            {t("tables")}
          </h2>
          <ul className="space-y-2">
            {bookings.reservations.map((r) => (
              <li
                key={r.public_token}
                className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <span className="min-w-48 flex-1">
                  <span className="block font-semibold">
                    {format.dateTime(new Date(r.starts_at), {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Colombo",
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {branchName(r.branch_id)} · {t("guests", { count: r.party_size })}
                  </span>
                </span>
                <Badge variant="outline">{t(`bookingStatus.${r.status}`)}</Badge>
                <Link
                  href={`/reservations/${r.public_token}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("view")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {bookings.inquiries.length > 0 && (
        <section aria-labelledby="events-title" className="space-y-3">
          <h2 id="events-title" className="font-display text-xl text-primary">
            {t("events")}
          </h2>
          <ul className="space-y-2">
            {bookings.inquiries.map((e) => (
              <li
                key={e.public_token}
                className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft"
              >
                <span className="min-w-48 flex-1">
                  <span className="block font-semibold">
                    {te(`types.${e.event_type}`)} ·{" "}
                    {format.dateTime(new Date(`${e.event_date}T00:00:00Z`), {
                      dateStyle: "medium",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {branchName(e.branch_id)} · {t("guests", { count: e.guests })}
                  </span>
                </span>
                <Badge variant="outline">{t(`eventStatus.${e.status}`)}</Badge>
                <Link
                  href={`/events/${e.public_token}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("view")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AccountShell>
  );
}
