import { LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Staff } from "@/lib/auth/staff";
import type { DashboardBranch } from "@/lib/dashboard/data";
import { cn } from "@/lib/utils";

import { AcceptingToggle } from "./accepting-toggle";

const TABS = [
  { key: "orders", label: "Orders", href: "/dashboard" },
  { key: "reservations", label: "Reservations", href: "/dashboard/reservations" },
  { key: "events", label: "Events", href: "/dashboard/events" },
  { key: "menu", label: "Menu availability", href: "/dashboard/menu" },
] as const;

export function DashboardShell({
  staff,
  brandName,
  branch,
  branches,
  current,
  children,
}: {
  staff: Staff;
  brandName: string;
  branch: DashboardBranch;
  branches: DashboardBranch[];
  current: (typeof TABS)[number]["key"];
  children: React.ReactNode;
}) {
  const query = branches.length > 1 ? `?branch=${branch.slug}` : "";
  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{brandName}</p>
            <h1 className="font-display text-xl text-primary">{branch.name}</h1>
          </div>
          {branches.length > 1 && (
            <nav aria-label="Branches" className="flex flex-wrap gap-1">
              {branches.map((b) => (
                <Link
                  key={b.id}
                  href={`${TABS.find((t) => t.key === current)!.href}?branch=${b.slug}`}
                  aria-current={b.id === branch.id ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm",
                    b.id === branch.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {b.name}
                </Link>
              ))}
            </nav>
          )}
          <nav aria-label="Dashboard" className="flex flex-wrap gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={`${tab.href}${query}`}
                aria-current={tab.key === current ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  tab.key === current
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-4">
            <AcceptingToggle
              key={`${branch.id}-${branch.isAcceptingOrders}`}
              branchId={branch.id}
              accepting={branch.isAcceptingOrders}
            />
            <form action={signOutAction} className="flex items-center gap-2">
              <input type="hidden" name="locale" value="en" />
              <span
                className="max-w-40 truncate text-sm text-muted-foreground"
                title={staff.email ?? undefined}
              >
                {staff.name ?? staff.email} · {staff.role}
              </span>
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}

/** Shown to signed-in people without a staff role, and staff without a branch. */
export function NoAccess({ reason }: { reason: "not-staff" | "no-branch" | "not-admin" }) {
  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-20 text-center">
      <h1 className="text-display-md text-primary">
        {reason === "not-staff"
          ? "This area is for branch staff"
          : reason === "not-admin"
            ? "This area is for admins"
            : "No branch assigned"}
      </h1>
      <p className="text-muted-foreground">
        {reason === "not-staff"
          ? "Your account doesn't have access to the dashboard. Ask an admin to add you as staff."
          : reason === "not-admin"
            ? "Your account can use the branch dashboard, but not the admin panel."
            : "Your account isn't linked to a branch yet. Ask an admin to assign one."}
      </p>
      <form action={signOutAction}>
        <input type="hidden" name="locale" value="en" />
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
