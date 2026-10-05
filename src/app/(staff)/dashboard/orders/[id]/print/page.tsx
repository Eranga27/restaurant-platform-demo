import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AutoPrint } from "@/components/dashboard/auto-print";
import { NoAccess } from "@/components/dashboard/dashboard-shell";
import { canActForBranch, requireStaffPage } from "@/lib/auth/staff";
import { getBoardOrder } from "@/lib/dashboard/data";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Print" };

const SPICE = { mild: "Mild", medium: "Medium", hot: "SRI LANKAN HOT" } as const;

function stamp(iso: string): string {
  return new Intl.DateTimeFormat("en-LK", {
    timeZone: "Asia/Colombo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** 80 mm thermal printer tickets: the kitchen copy (no prices) or the customer receipt. */
export default async function PrintPage({
  params,
  searchParams,
}: PageProps<"/dashboard/orders/[id]/print">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const staff = await requireStaffPage(`/dashboard/orders/${id}/print`);
  if (!staff) return <NoAccess reason="not-staff" />;
  const order = await getBoardOrder(id);
  if (!order || !canActForBranch(staff, order.branchId)) notFound();

  const [brand, branches] = await Promise.all([getBrand(), getBranches("en")]);
  const branch = branches.find((b) => b.id === order.branchId);
  const kitchen = query.copy !== "receipt";
  const delivery = order.type === "delivery";

  return (
    <main className="mx-auto w-[80mm] max-w-full bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <style>{`
        @page { size: 80mm auto; margin: 3mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
        }
      `}</style>
      <div className="no-print mb-4 flex justify-end">
        <AutoPrint />
      </div>

      {kitchen ? (
        <>
          <p className="text-center text-[11px] uppercase">Kitchen · {branch?.name}</p>
          <p className="my-1 text-center text-3xl font-bold tracking-widest">
            {order.order_number}
          </p>
          <p className="text-center text-sm font-bold uppercase">
            {delivery ? "Delivery" : "Pickup"} ·{" "}
            {order.scheduled_for ? `For ${stamp(order.scheduled_for)}` : "ASAP"}
          </p>
          <p className="text-center">Received {stamp(order.receivedAt)}</p>
          <hr className="my-2 border-dashed border-black" />
          <ul className="space-y-2">
            {order.items.map((item, i) => (
              <li key={i}>
                <p className="text-[15px] font-bold">
                  {item.quantity} × {item.name}
                </p>
                {item.details.map((d) => (
                  <p key={d} className="pl-4">
                    + {d}
                  </p>
                ))}
                {item.spiceLevel && (
                  <p className="pl-4 font-bold">Spice: {SPICE[item.spiceLevel]}</p>
                )}
                {item.instructions && <p className="pl-4">“{item.instructions}”</p>}
              </li>
            ))}
          </ul>
          {order.notes && (
            <>
              <hr className="my-2 border-dashed border-black" />
              <p className="font-bold">NOTE: {order.notes}</p>
            </>
          )}
          <hr className="my-2 border-dashed border-black" />
          <p>For: {order.customer_name}</p>
        </>
      ) : (
        <>
          <p className="text-center text-base font-bold">{brand.name}</p>
          <p className="text-center">{branch?.name}</p>
          {branch && (
            <p className="text-center">
              {branch.addressLine}, {branch.city}
              <br />
              {formatPhone(branch.phone)}
            </p>
          )}
          <hr className="my-2 border-dashed border-black" />
          <p>Order: {order.order_number}</p>
          <p>Date: {stamp(order.created_at)}</p>
          <p>
            {delivery ? "Delivery" : "Pickup"} · {order.customer_name}
          </p>
          <hr className="my-2 border-dashed border-black" />
          <table className="w-full">
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="align-top">
                  <td className="pr-2">
                    {item.quantity} × {item.name}
                    {item.details.length > 0 && (
                      <span className="block pl-3 text-[11px]">{item.details.join(", ")}</span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap">{formatLKR(item.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="my-2 border-dashed border-black" />
          <table className="w-full">
            <tbody>
              <Row label="Subtotal" value={formatLKR(order.subtotal_cents)} />
              {order.discount_cents > 0 && (
                <Row label="Discount" value={formatLKR(-order.discount_cents)} />
              )}
              <Row
                label={`Service charge ${brand.charges.serviceChargeBps / 100}%`}
                value={formatLKR(order.service_charge_cents)}
              />
              <Row
                label={`VAT ${brand.charges.vatBps / 100}%`}
                value={formatLKR(order.vat_cents)}
              />
              {delivery && <Row label="Delivery" value={formatLKR(order.delivery_fee_cents)} />}
              <Row label="TOTAL" value={formatLKR(order.total_cents)} strong />
            </tbody>
          </table>
          <p className="mt-2">
            {order.payment_status === "paid"
              ? order.payment_method === "payhere"
                ? "Paid online (PayHere)"
                : "Paid in cash"
              : delivery
                ? "Cash on delivery"
                : "Pay at the counter"}
          </p>
          <hr className="my-2 border-dashed border-black" />
          <p className="text-center">Thank you! · {brand.contact.email}</p>
        </>
      )}
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? "text-[14px] font-bold" : undefined}>
      <td>{label}</td>
      <td className="text-right whitespace-nowrap">{value}</td>
    </tr>
  );
}
