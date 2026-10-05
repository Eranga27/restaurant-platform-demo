import { LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Staff } from "@/lib/auth/staff";
import { cn } from "@/lib/utils";

export const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "orders", label: "Orders", href: "/admin/orders" },
  { key: "bookings", label: "Bookings", href: "/admin/bookings" },
  { key: "menu", label: "Menu", href: "/admin/menu" },
  { key: "branches", label: "Branches", href: "/admin/branches" },
  { key: "holidays", label: "Holidays", href: "/admin/holidays" },
  { key: "promo-codes", label: "Promo codes", href: "/admin/promo-codes" },
  { key: "reviews", label: "Reviews", href: "/admin/reviews" },
  { key: "payments", label: "Payments", href: "/admin/payments" },
  { key: "staff", label: "Staff", href: "/admin/staff" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
  { key: "audit", label: "Audit log", href: "/admin/audit" },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/** Layout for every admin page: section navigation, the admin's name and sign-out. */
export function AdminShell({
  staff,
  brandName,
  current,
  title,
  actions,
  children,
}: {
  staff: Staff;
  brandName: string;
  current: AdminSection;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col lg:flex-row">
      <aside className="border-b bg-card lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{brandName}</p>
            <p className="font-display text-lg text-primary">Admin</p>
          </div>
        </div>
        <nav
          aria-label="Admin"
          className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:px-3"
        >
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              aria-current={section.key === current ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                section.key === current
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {section.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground lg:mt-4"
          >
            <LayoutDashboard aria-hidden className="size-4" /> Branch dashboard
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <h1 className="font-display text-2xl text-primary">{title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <form action={signOutAction} className="flex items-center gap-2">
              <input type="hidden" name="locale" value="en" />
              <span
                className="max-w-48 truncate text-sm text-muted-foreground"
                title={staff.email ?? undefined}
              >
                {staff.name ?? staff.email}
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
        </header>
        <main id="main" className="space-y-6 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/** A titled panel. */
export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 rounded-2xl border bg-card p-5 shadow-soft", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h2 className="font-display text-lg text-primary">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
