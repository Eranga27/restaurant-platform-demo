import type { Metadata } from "next";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { FilterBar, FilterField, FilterSelect } from "@/components/admin/filters";
import { SalesChart } from "@/components/admin/sales-chart";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { colomboToday, getSalesReport, isoDate, param } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin" };

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const query = await searchParams;
  const staff = await requireAdminPage("/admin");
  if (!staff) return <NoAccess reason="not-admin" />;

  const fromParam = param(query.from);
  const toParam = param(query.to);
  const from = fromParam && isoDate.test(fromParam) ? fromParam : colomboToday(-29);
  const to = toParam && isoDate.test(toParam) ? toParam : colomboToday();
  const branches = await getBranches("en");
  const branchId = branches.find((b) => b.id === param(query.branch))?.id;

  const [report, brand] = await Promise.all([getSalesReport(from, to, branchId), getBrand()]);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "Unknown";
  const orders = report.totals.orders;

  return (
    <AdminShell staff={staff} brandName={brand.name} current="overview" title="Overview">
      <FilterBar>
        <FilterField label="From" name="from" type="date" defaultValue={from} />
        <FilterField label="To" name="to" type="date" defaultValue={to} />
        <FilterSelect
          label="Branch"
          name="branch"
          defaultValue={branchId}
          options={[
            { value: "", label: "All branches" },
            ...branches.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
      </FilterBar>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Revenue", formatLKR(report.totals.revenueCents)],
          ["Orders", String(orders)],
          ["Average order", formatLKR(report.totals.averageCents)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display text-3xl text-primary tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Panel
        title="Revenue by day"
        description="Orders that reached the branch, excluding rejected and cancelled ones."
      >
        <SalesChart days={report.byDay} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top dishes" className="lg:col-span-2">
          {report.topItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Dish</th>
                  <th className="py-1 text-right font-medium">Sold</th>
                  <th className="py-1 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {report.topItems.map((item) => (
                  <tr key={item.name} className="border-t">
                    <td className="py-1.5">{item.name}</td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">{formatLKR(item.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title="Order type">
            <ul className="space-y-1 text-sm">
              {(["delivery", "pickup"] as const).map((type) => (
                <li key={type} className="flex justify-between">
                  <span className="capitalize">{type}</span>
                  <span className="tabular-nums">
                    {report.byType[type] ?? 0} ({percent(report.byType[type] ?? 0, orders)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Payment">
            <ul className="space-y-1 text-sm">
              {(
                [
                  ["cod", "Cash"],
                  ["payhere", "Online (PayHere)"],
                ] as const
              ).map(([key, label]) => (
                <li key={key} className="flex justify-between">
                  <span>{label}</span>
                  <span className="tabular-nums">
                    {report.byPayment[key] ?? 0} ({percent(report.byPayment[key] ?? 0, orders)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {!branchId && (
        <Panel title="By branch">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Branch</th>
                <th className="py-1 text-right font-medium">Orders</th>
                <th className="py-1 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {report.byBranch.map((b) => (
                <tr key={b.branchId} className="border-t">
                  <td className="py-1.5">{branchName(b.branchId)}</td>
                  <td className="py-1.5 text-right">{b.orders}</td>
                  <td className="py-1.5 text-right">{formatLKR(b.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </AdminShell>
  );
}
