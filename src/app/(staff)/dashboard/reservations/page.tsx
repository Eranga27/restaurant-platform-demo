import type { Metadata } from "next";
import Link from "next/link";

import { DashboardShell, NoAccess } from "@/components/dashboard/dashboard-shell";
import { ReservationList } from "@/components/dashboard/reservation-list";
import { requireStaffPage } from "@/lib/auth/staff";
import { getDayReservations, pickBranch } from "@/lib/dashboard/data";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { onlineSeats } from "@/lib/reservations/slots";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reservations" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function colomboDate(offsetDays: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

export default async function ReservationsDashboardPage({
  searchParams,
}: PageProps<"/dashboard/reservations">) {
  const query = await searchParams;
  const staff = await requireStaffPage("/dashboard/reservations");
  if (!staff) return <NoAccess reason="not-staff" />;
  const { branch, branches } = await pickBranch(staff, query.branch);
  if (!branch) return <NoAccess reason="no-branch" />;

  const today = colomboDate(0);
  const date = typeof query.date === "string" && DATE.test(query.date) ? query.date : today;
  const [bookings, brand, branchViews] = await Promise.all([
    getDayReservations(branch.id, date),
    getBrand(),
    getBranches("en"),
  ]);
  const capacity = branchViews.find((b) => b.id === branch.id)?.seatingCapacity ?? 0;
  const days = Array.from({ length: 8 }, (_, i) => colomboDate(i));
  const branchQuery = branches.length > 1 ? `&branch=${branch.slug}` : "";
  const label = (iso: string) =>
    new Intl.DateTimeFormat("en-LK", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));
  const active = bookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const guests = active.reduce((n, b) => n + b.party_size, 0);

  return (
    <DashboardShell
      staff={staff}
      brandName={brand.name}
      branch={branch}
      branches={branches}
      current="reservations"
    >
      <div className="space-y-5">
        <nav aria-label="Days" className="flex flex-wrap gap-2">
          {days.map((d) => (
            <Link
              key={d}
              href={`/dashboard/reservations?date=${d}${branchQuery}`}
              aria-current={d === date ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                d === date ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {d === today ? "Today" : label(d)}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">
          {active.length} booking{active.length === 1 ? "" : "s"} · {guests} guest
          {guests === 1 ? "" : "s"} · {onlineSeats(capacity, brand.reservations)} of {capacity}{" "}
          seats bookable online at a time
        </p>
        <ReservationList bookings={bookings} />
      </div>
    </DashboardShell>
  );
}
