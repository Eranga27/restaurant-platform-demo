import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { FilterBar, FilterField, FilterSelect } from "@/components/admin/filters";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { colomboToday, getBookingCounts, getEventCounts, param } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Bookings" };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A month of table bookings and event enquiries; each day links to the branch's list. */
export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin/bookings");
  if (!staff) return <NoAccess reason="not-admin" />;

  const monthParam = param(query.month);
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : colomboToday().slice(0, 7);
  const [branches, brand] = await Promise.all([getBranches("en"), getBrand()]);
  const branch = branches.find((b) => b.id === param(query.branch));
  const [bookings, events] = await Promise.all([
    getBookingCounts(month, branch?.id),
    getEventCounts(month, branch?.id),
  ]);

  const first = new Date(`${month}-01T00:00:00Z`);
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const today = colomboToday();
  const shift = (n: number) => {
    const d = new Date(first);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const branchQuery = branch ? `&branch=${branch.id}` : "";
  // The dashboard's day list needs one branch: the chosen one, or the first.
  const dayBranch = branch ?? branches[0];

  return (
    <AdminShell staff={staff} brandName={brand.name} current="bookings" title="Bookings">
      <FilterBar>
        <FilterField label="Month" name="month" type="month" defaultValue={month} />
        <FilterSelect
          label="Branch"
          name="branch"
          defaultValue={branch?.id}
          options={[
            { value: "", label: "All branches" },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
      </FilterBar>

      <div className="flex items-center justify-between">
        <Link href={`/admin/bookings?month=${shift(-1)}${branchQuery}`} className="text-sm">
          ← Previous
        </Link>
        <h2 className="font-display text-xl text-primary">
          {new Intl.DateTimeFormat("en-LK", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(first)}
        </h2>
        <Link href={`/admin/bookings?month=${shift(1)}${branchQuery}`} className="text-sm">
          Next →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const day = bookings.get(date);
            const enquiries = events.get(date) ?? 0;
            return (
              <Link
                key={date}
                href={`/dashboard/reservations?date=${date}${dayBranch ? `&branch=${dayBranch.slug}` : ""}`}
                className={cn(
                  "min-h-24 rounded-xl border bg-card p-2 text-sm hover:border-primary",
                  date === today && "border-primary ring-1 ring-primary",
                )}
              >
                <span className="font-semibold">{i + 1}</span>
                {day && (
                  <span className="mt-1 block text-xs">
                    {day.bookings} booking{day.bookings === 1 ? "" : "s"}
                    <span className="block text-muted-foreground">{day.guests} guests</span>
                  </span>
                )}
                {enquiries > 0 && (
                  <span className="mt-1 inline-block rounded-full bg-highlight/30 px-2 py-0.5 text-xs font-medium">
                    {enquiries} event{enquiries === 1 ? "" : "s"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Days open the branch&apos;s booking list
        {branch ? "" : ` (${dayBranch?.name ?? "first branch"}; choose a branch to change it)`}.
        Event enquiries are managed in the branch dashboard&apos;s{" "}
        <Link
          href={`/dashboard/events${dayBranch ? `?branch=${dayBranch.slug}` : ""}`}
          className="underline"
        >
          Events
        </Link>{" "}
        tab.
      </p>
    </AdminShell>
  );
}
