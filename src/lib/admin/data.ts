import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Admin reads, as the signed-in admin (RLS: is_admin(), which needs MFA).
 * Callers check the role first; the database checks again.
 */

export const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function colomboToday(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(
    new Date(Date.now() + offsetDays * 86_400_000),
  );
}

/** A query value as a single string, or undefined. */
export function param(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const reportSchema = z.object({
  totals: z.object({
    orders: z.number(),
    revenueCents: z.coerce.number(),
    averageCents: z.coerce.number(),
  }),
  byDay: z.array(
    z.object({ day: z.string(), orders: z.number(), revenueCents: z.coerce.number() }),
  ),
  byBranch: z.array(
    z.object({ branchId: z.uuid(), orders: z.number(), revenueCents: z.coerce.number() }),
  ),
  byType: z.record(z.string(), z.number()),
  byPayment: z.record(z.string(), z.number()),
  topItems: z.array(
    z.object({ name: z.string(), quantity: z.coerce.number(), revenueCents: z.coerce.number() }),
  ),
});

export type SalesReport = z.infer<typeof reportSchema>;

export async function getSalesReport(from: string, to: string, branchId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_sales_report", {
    from_date: from,
    to_date: to,
    branch: branchId ?? null,
  });
  if (error) throw new Error(`Failed to load the report: ${error.message}`);
  return reportSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  "awaiting_payment",
  "received",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type OrderFilters = {
  branchId?: string;
  status?: (typeof ORDER_STATUSES)[number];
  from?: string;
  to?: string;
  /** Order number or the customer's phone digits. */
  search?: string;
};

const adminOrderRow = z.object({
  id: z.uuid(),
  order_number: z.string(),
  public_token: z.string(),
  branch_id: z.uuid(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().nullable(),
  type: z.enum(["delivery", "pickup"]),
  status: z.enum(ORDER_STATUSES),
  scheduled_for: z.string().nullable(),
  subtotal_cents: z.number().int(),
  discount_cents: z.number().int(),
  service_charge_cents: z.number().int(),
  vat_cents: z.number().int(),
  delivery_fee_cents: z.number().int(),
  total_cents: z.number().int(),
  payment_method: z.enum(["cod", "payhere"]),
  payment_status: z.enum(["pending", "paid", "failed", "refunded", "charged_back"]),
  created_at: z.string(),
});

export type AdminOrder = z.infer<typeof adminOrderRow>;

export const ORDERS_PAGE_SIZE = 50;

/** Filtered orders across branches, newest first. `limit` large for exports. */
export async function getOrders(filters: OrderFilters, page = 0, limit = ORDERS_PAGE_SIZE) {
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, public_token, branch_id, customer_name, customer_phone, customer_email, type, status, scheduled_for, subtotal_cents, discount_cents, service_charge_cents, vat_cents, delivery_fee_cents, total_cents, payment_method, payment_status, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(page * limit, page * limit + limit - 1);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from)
    query = query.gte("created_at", new Date(`${filters.from}T00:00:00+05:30`).toISOString());
  if (filters.to)
    query = query.lt(
      "created_at",
      new Date(new Date(`${filters.to}T00:00:00+05:30`).getTime() + 86_400_000).toISOString(),
    );
  if (filters.search) {
    const term = filters.search.trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(term)) query = query.eq("order_number", term);
    else {
      const digits = term.replace(/\D/g, "").replace(/^0/, "");
      if (digits.length >= 4) query = query.like("customer_phone", `%${digits}%`);
    }
  }
  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return { orders: z.array(adminOrderRow).parse(data ?? []), total: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Bookings calendar
// ---------------------------------------------------------------------------

/** Bookings and guests per day in a month, optionally for one branch. */
export async function getBookingCounts(month: string, branchId?: string) {
  const start = new Date(`${month}-01T00:00:00+05:30`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select("starts_at, party_size, status")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .in("status", ["confirmed", "seated", "completed"]);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  const days = new Map<string, { bookings: number; guests: number }>();
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" });
  for (const row of z
    .array(z.object({ starts_at: z.string(), party_size: z.number() }))
    .parse(data ?? [])) {
    const day = format.format(new Date(row.starts_at));
    const entry = days.get(day) ?? { bookings: 0, guests: 0 };
    entry.bookings += 1;
    entry.guests += row.party_size;
    days.set(day, entry);
  }
  return days;
}

/** Event enquiries in a month by status, optionally for one branch. */
export async function getEventCounts(month: string, branchId?: string) {
  const start = `${month}-01`;
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const supabase = await createClient();
  let query = supabase
    .from("event_inquiries")
    .select("event_date, status, guests")
    .gte("event_date", start)
    .lt("event_date", endDate.toISOString().slice(0, 10))
    .in("status", ["new", "quoted", "confirmed"]);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load events: ${error.message}`);
  const days = new Map<string, number>();
  for (const row of z.array(z.object({ event_date: z.string() })).parse(data ?? [])) {
    days.set(row.event_date, (days.get(row.event_date) ?? 0) + 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Payments and refunds
// ---------------------------------------------------------------------------

const paymentRow = z.object({
  id: z.uuid(),
  reference: z.string(),
  amount_cents: z.number().int(),
  status: z.string(),
  method: z.string().nullable(),
  provider_payment_id: z.string().nullable(),
  created_at: z.string(),
  refunded_at: z.string().nullable(),
  refund_note: z.string().nullable(),
  order_id: z.uuid().nullable(),
  event_inquiry_id: z.uuid().nullable(),
  orders: z
    .object({
      order_number: z.string(),
      status: z.string(),
      customer_name: z.string(),
      public_token: z.string(),
    })
    .nullable(),
  event_inquiries: z
    .object({
      reference: z.string(),
      status: z.string(),
      contact_name: z.string(),
      public_token: z.string(),
    })
    .nullable(),
});

export type AdminPayment = z.infer<typeof paymentRow> & { needsRefund: boolean };

/** Recent payments, with the ones that need a refund flagged first. */
export async function getPayments(): Promise<AdminPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, reference, amount_cents, status, method, provider_payment_id, created_at, refunded_at, refund_note, order_id, event_inquiry_id, orders (order_number, status, customer_name, public_token), event_inquiries (reference, status, contact_name, public_token)",
    )
    .in("status", ["paid", "refunded", "charged_back", "pending"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load payments: ${error.message}`);
  return z
    .array(paymentRow)
    .parse(data ?? [])
    .map((p) => ({
      ...p,
      // Paid for something that won't happen: the customer is owed a refund.
      needsRefund:
        p.status === "paid" &&
        ((p.orders !== null && ["rejected", "cancelled"].includes(p.orders.status)) ||
          (p.event_inquiries !== null &&
            ["declined", "cancelled"].includes(p.event_inquiries.status))),
    }))
    .sort((a, b) => Number(b.needsRefund) - Number(a.needsRefund));
}

const notificationRow = z.object({
  id: z.number(),
  reference: z.string(),
  status_code: z.number(),
  outcome: z.string(),
  received_at: z.string(),
});

/** PayHere notifications that need a person: wrong amounts, unknown payments, late payments. */
export async function getFlaggedNotifications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_notifications")
    .select("id, reference, status_code, outcome, received_at")
    .in("outcome", ["amount_mismatch", "unknown_reference", "paid_after_cancel"])
    .order("received_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return z.array(notificationRow).parse(data ?? []);
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

const staffRow = z.object({
  user_id: z.uuid(),
  email: z.string().nullable(),
  full_name: z.string().nullable(),
  role: z.enum(["customer", "staff", "manager", "admin"]),
  branch_id: z.uuid().nullable(),
  created_at: z.string(),
});

export type StaffMember = z.infer<typeof staffRow>;

export async function getStaffList(): Promise<StaffMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_staff_list");
  if (error) throw new Error(`Failed to load staff: ${error.message}`);
  return z.array(staffRow).parse(data ?? []);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

const auditRow = z.object({
  id: z.number(),
  actor_id: z.uuid().nullable(),
  action: z.enum(["insert", "update", "delete"]),
  entity: z.string(),
  entity_id: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  ip: z.string().nullable(),
  created_at: z.string(),
});

export type AuditEntry = z.infer<typeof auditRow>;

export const AUDIT_PAGE_SIZE = 50;

export async function getAuditLog(filters: { entity?: string }, page = 0) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, before, after, ip, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(page * AUDIT_PAGE_SIZE, page * AUDIT_PAGE_SIZE + AUDIT_PAGE_SIZE - 1);
  if (filters.entity) query = query.eq("entity", filters.entity);
  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to load the audit log: ${error.message}`);
  return { entries: z.array(auditRow).parse(data ?? []), total: count ?? 0 };
}
