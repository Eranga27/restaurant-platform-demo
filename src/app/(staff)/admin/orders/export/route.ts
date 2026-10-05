import { getOrders } from "@/lib/admin/data";
import { orderFilters, STATUS_LABEL } from "@/lib/admin/orders";
import { getStaff } from "@/lib/auth/staff";
import { getBranches } from "@/lib/data/catalogue";

/**
 * CSV of the filtered orders, for accounting. Admins with MFA only; up to
 * 5,000 rows. Cells that a spreadsheet would run as a formula are escaped.
 */

const MAX_ROWS = 5000;

/** CSV-safe cell, defusing =, +, -, @ formula injection (OWASP). */
function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

const rupees = (cents: number) => (cents / 100).toFixed(2);

export async function GET(request: Request) {
  const staff = await getStaff();
  if (staff?.role !== "admin") return new Response("Not allowed", { status: 403 });

  const url = new URL(request.url);
  const branches = await getBranches("en");
  const filters = orderFilters(
    Object.fromEntries(url.searchParams),
    branches.map((b) => b.id),
  );
  const { orders } = await getOrders(filters, 0, MAX_ROWS);
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? "";

  const header = [
    "Order",
    "Placed (Sri Lanka time)",
    "Branch",
    "Customer",
    "Phone",
    "Email",
    "Type",
    "Status",
    "Payment method",
    "Payment status",
    "Subtotal",
    "Discount",
    "Service charge",
    "VAT",
    "Delivery fee",
    "Total",
  ];
  const time = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const lines = [
    header.map(cell).join(","),
    ...orders.map((o) =>
      [
        o.order_number,
        time.format(new Date(o.created_at)).replace(",", ""),
        branchName(o.branch_id),
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        o.type,
        STATUS_LABEL[o.status],
        o.payment_method === "cod" ? "Cash" : "PayHere",
        o.payment_status,
        rupees(o.subtotal_cents),
        rupees(o.discount_cents),
        rupees(o.service_charge_cents),
        rupees(o.vat_cents),
        rupees(o.delivery_fee_cents),
        rupees(o.total_cents),
      ]
        .map(cell)
        .join(","),
    ),
  ];

  // The BOM makes Excel read the file as UTF-8 (Sinhala and Tamil names).
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
