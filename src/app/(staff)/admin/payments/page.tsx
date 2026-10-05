import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell, Panel } from "@/components/admin/admin-shell";
import { RefundButton } from "@/components/admin/refund-button";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { getFlaggedNotifications, getPayments, type AdminPayment } from "@/lib/admin/data";
import { requireAdminPage } from "@/lib/auth/staff";
import { getBrand } from "@/lib/data/brand";
import { formatLKR } from "@/lib/money";
import { payhereConfig } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Payments" };

const OUTCOMES: Record<string, string> = {
  amount_mismatch: "Amount or currency didn't match",
  unknown_reference: "Payment we don't recognise",
  paid_after_cancel: "Paid after the order was cancelled",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

function forWhat(p: AdminPayment) {
  if (p.orders)
    return (
      <Link
        href={`/track/${p.orders.public_token}`}
        target="_blank"
        className="text-primary hover:underline"
      >
        Order {p.orders.order_number} · {p.orders.customer_name} ({p.orders.status})
      </Link>
    );
  if (p.event_inquiries)
    return (
      <Link
        href={`/events/${p.event_inquiries.public_token}`}
        target="_blank"
        className="text-primary hover:underline"
      >
        Event deposit {p.event_inquiries.reference} · {p.event_inquiries.contact_name} (
        {p.event_inquiries.status})
      </Link>
    );
  return "—";
}

export default async function AdminPaymentsPage() {
  const staff = await requireAdminPage("/admin/payments");
  if (!staff) return <NoAccess reason="not-admin" />;
  const [payments, flagged, brand] = await Promise.all([
    getPayments(),
    getFlaggedNotifications(),
    getBrand(),
  ]);
  const owed = payments.filter((p) => p.needsRefund);
  const sandbox = payhereConfig()?.sandbox;
  const portal =
    sandbox === false ? "https://www.payhere.lk/merchant/" : "https://sandbox.payhere.lk/merchant/";

  return (
    <AdminShell staff={staff} brandName={brand.name} current="payments" title="Payments">
      <Panel
        title="Refunds to make"
        description="Online payments for orders or events that won't go ahead. Refund them in the PayHere merchant portal, then mark them here."
      >
        {owed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to refund.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {owed.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-semibold tabular-nums">{formatLKR(p.amount_cents)}</span>
                <span className="min-w-60 flex-1">{forWhat(p)}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  PayHere {p.provider_payment_id ?? p.reference}
                </span>
                <RefundButton paymentId={p.id} />
              </li>
            ))}
          </ul>
        )}
        <a
          href={portal}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary underline"
        >
          Open the PayHere merchant portal
        </a>
      </Panel>

      {flagged.length > 0 && (
        <Panel
          title="Notifications to check"
          description="PayHere told us about these, but they didn't match an order as expected."
        >
          <ul className="divide-y rounded-xl border text-sm">
            {flagged.map((n) => (
              <li key={n.id} className="flex flex-wrap gap-3 px-4 py-2">
                <span className="font-mono">{n.reference}</span>
                <span className="flex-1">{OUTCOMES[n.outcome] ?? n.outcome}</span>
                <span className="text-muted-foreground">{when(n.received_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Recent payments">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 font-medium">When</th>
                <th className="py-2 font-medium">For</th>
                <th className="py-2 font-medium">Method</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 whitespace-nowrap">{when(p.created_at)}</td>
                  <td className="py-2">{forWhat(p)}</td>
                  <td className="py-2">{p.method ?? "—"}</td>
                  <td className="py-2">
                    <Badge variant={p.status === "paid" ? "secondary" : "outline"}>
                      {p.status}
                    </Badge>
                    {p.refund_note && (
                      <span className="block text-xs text-muted-foreground">{p.refund_note}</span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatLKR(p.amount_cents)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No online payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AdminShell>
  );
}
