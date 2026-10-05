import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { FilterBar, FilterSelect } from "@/components/admin/filters";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { AUDIT_PAGE_SIZE, getAuditLog, getStaffList, param } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit log" };

const ENTITIES: Record<string, string> = {
  menu_items: "Dishes",
  categories: "Categories",
  item_options: "Choice groups",
  item_option_values: "Choices",
  branch_menu_overrides: "Branch prices and availability",
  branches: "Branches",
  branch_secrets: "Branch alerts",
  holidays: "Holidays",
  promotions: "Promotions",
  promo_codes: "Promo codes",
  settings: "Settings",
  profiles: "Staff roles",
  mfa_factors: "Two-step sign-in",
  reservations: "Bookings",
  event_inquiries: "Event enquiries",
  payments: "Refunds",
  reviews: "Reviews",
};

/** Short display of a changed value. */
function show(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin/audit");
  if (!staff) return <NoAccess reason="not-admin" />;

  const entity = Object.keys(ENTITIES).find((e) => e === param(query.entity));
  const page = Math.max(0, Number(param(query.page) ?? 0) || 0);
  const [{ entries, total }, members, brand] = await Promise.all([
    getAuditLog({ entity }, page),
    getStaffList(),
    getBrand(),
  ]);
  const who = (id: string | null) => {
    if (!id) return "System";
    const m = members.find((x) => x.user_id === id);
    return m ? (m.full_name ?? m.email ?? id) : "Former staff";
  };
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const link = (p: number) =>
    `/admin/audit?${new URLSearchParams({ ...(entity ? { entity } : {}), page: String(p) })}`;

  return (
    <AdminShell staff={staff} brandName={brand.name} current="audit" title="Audit log">
      <FilterBar>
        <FilterSelect
          label="What changed"
          name="entity"
          defaultValue={entity}
          options={[
            { value: "", label: "Everything" },
            ...Object.entries(ENTITIES).map(([value, label]) => ({ value, label })),
          ]}
        />
      </FilterBar>

      <ul className="divide-y rounded-2xl border bg-card shadow-soft">
        {entries.length === 0 && (
          <li className="px-4 py-8 text-center text-muted-foreground">No changes yet.</li>
        )}
        {entries.map((e) => {
          const keys = Object.keys({ ...(e.before ?? {}), ...(e.after ?? {}) });
          return (
            <li key={e.id} className="space-y-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{who(e.actor_id)}</span>
                <Badge variant="outline">{e.action}</Badge>
                <span>{ENTITIES[e.entity] ?? e.entity}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-LK", {
                    timeZone: "Asia/Colombo",
                    dateStyle: "medium",
                    timeStyle: "medium",
                  }).format(new Date(e.created_at))}
                  {e.ip ? ` · ${e.ip}` : ""}
                </span>
              </div>
              {e.action === "update" ? (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {keys.slice(0, 8).map((k) => (
                    <li key={k}>
                      <span className="font-mono">{k}</span>: {show(e.before?.[k])} →{" "}
                      {show(e.after?.[k])}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {show(
                    (e.after ?? e.before)?.name_i18n ?? (e.after ?? e.before)?.code ?? e.entity_id,
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
          {page > 0 && <Link href={link(page - 1)}>← Newer</Link>}
          <span className="text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          {page + 1 < pages && <Link href={link(page + 1)}>Older →</Link>}
        </nav>
      )}
    </AdminShell>
  );
}
