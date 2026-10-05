import { Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { FilterBar, FilterField, FilterSelect } from "@/components/admin/filters";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOrders, ORDER_STATUSES, ORDERS_PAGE_SIZE, param } from "@/lib/admin/data";
import { orderFilters, STATUS_LABEL } from "@/lib/admin/orders";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Orders" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin/orders");
  if (!staff) return <NoAccess reason="not-admin" />;

  const [branches, brand] = await Promise.all([getBranches("en"), getBrand()]);
  const filters = orderFilters(
    query,
    branches.map((b) => b.id),
  );
  const page = Math.max(0, Number(param(query.page) ?? 0) || 0);
  const { orders, total } = await getOrders(filters, page);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "";

  const qs = new URLSearchParams(
    Object.entries({
      branch: filters.branchId,
      status: filters.status,
      from: filters.from,
      to: filters.to,
      q: filters.search,
    }).filter((e): e is [string, string] => Boolean(e[1])),
  );
  const pageLink = (p: number) =>
    `/admin/orders?${new URLSearchParams([...qs, ["page", String(p)]])}`;

  return (
    <AdminShell
      staff={staff}
      brandName={brand.name}
      current="orders"
      title="Orders"
      actions={
        <Button asChild variant="outline" size="sm">
          <a href={`/admin/orders/export?${qs}`}>
            <Download data-icon="inline-start" aria-hidden />
            Export CSV
          </a>
        </Button>
      }
    >
      <FilterBar>
        <FilterSelect
          label="Branch"
          name="branch"
          defaultValue={filters.branchId}
          options={[
            { value: "", label: "All branches" },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <FilterSelect
          label="Status"
          name="status"
          defaultValue={filters.status}
          options={[
            { value: "", label: "Any status" },
            ...ORDER_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
        />
        <FilterField label="From" name="from" type="date" defaultValue={filters.from} />
        <FilterField label="To" name="to" type="date" defaultValue={filters.to} />
        <FilterField
          label="Order or phone"
          name="q"
          defaultValue={filters.search}
          placeholder="RG6WR6"
        />
      </FilterBar>

      <p className="text-sm text-muted-foreground">
        {total} order{total === 1 ? "" : "s"}
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Placed</th>
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Payment</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <Link
                    href={`/track/${o.public_token}`}
                    target="_blank"
                    className="font-mono font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Intl.DateTimeFormat("en-LK", {
                    timeZone: "Asia/Colombo",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(o.created_at))}
                </td>
                <td className="px-4 py-2">{branchName(o.branch_id)}</td>
                <td className="px-4 py-2">
                  {o.customer_name}
                  <span className="block text-xs text-muted-foreground">
                    {formatPhone(o.customer_phone)}
                  </span>
                </td>
                <td className="px-4 py-2 capitalize">{o.type}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline">{STATUS_LABEL[o.status]}</Badge>
                </td>
                <td className="px-4 py-2">
                  {o.payment_method === "cod" ? "Cash" : "Online"} · {o.payment_status}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{formatLKR(o.total_cents)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
          {page > 0 && <Link href={pageLink(page - 1)}>← Newer</Link>}
          <span className="text-muted-foreground">
            Page {page + 1} of {pages}
          </span>
          {page + 1 < pages && <Link href={pageLink(page + 1)}>Older →</Link>}
        </nav>
      )}
    </AdminShell>
  );
}
