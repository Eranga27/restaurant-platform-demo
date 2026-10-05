import "server-only";

import { z } from "zod";

import type { Staff } from "@/lib/auth/staff";
import { localize } from "@/lib/data/catalogue";
import { getPublicRows } from "@/lib/data/source";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard reads. Orders are read as the signed-in staff member, so RLS
 * limits them to their own branch (admins see all); the code filters by
 * branch as well.
 */

export type DashboardBranch = {
  id: string;
  slug: string;
  name: string;
  isAcceptingOrders: boolean;
};

/** The branches this staff member can open: their own, or every branch for admins. */
export async function getStaffBranches(staff: Staff): Promise<DashboardBranch[]> {
  const rows = await getPublicRows();
  return rows.branches
    .filter((b) => staff.role === "admin" || b.id === staff.branchId)
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      name: localize(b.name_i18n, "en"),
      isAcceptingOrders: b.is_accepting_orders,
    }));
}

/** The branch chosen with `?branch=<slug>`, or the first one this staff member can open. */
export async function pickBranch(
  staff: Staff,
  slug: string | string[] | undefined,
): Promise<{ branch: DashboardBranch | null; branches: DashboardBranch[] }> {
  const branches = await getStaffBranches(staff);
  const wanted = typeof slug === "string" ? branches.find((b) => b.slug === slug) : undefined;
  return { branch: wanted ?? branches[0] ?? null, branches };
}

const i18n = z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() });

const boardOrderRow = z.object({
  id: z.uuid(),
  order_number: z.string(),
  status: z.enum([
    "received",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "rejected",
    "cancelled",
  ]),
  type: z.enum(["delivery", "pickup"]),
  scheduled_for: z.string().nullable(),
  customer_name: z.string(),
  customer_phone: z.string(),
  delivery_address: z.string().nullable(),
  delivery_landmark: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_lat: z.number().nullable(),
  delivery_lng: z.number().nullable(),
  notes: z.string().nullable(),
  subtotal_cents: z.number().int(),
  discount_cents: z.number().int(),
  service_charge_cents: z.number().int(),
  vat_cents: z.number().int(),
  delivery_fee_cents: z.number().int(),
  total_cents: z.number().int(),
  payment_method: z.enum(["cod", "payhere"]),
  payment_status: z.enum(["pending", "paid", "failed", "refunded", "charged_back"]),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  order_items: z.array(
    z.object({
      name_i18n: i18n,
      quantity: z.number().int(),
      unit_price_cents: z.number().int(),
      line_total_cents: z.number().int(),
      options: z.array(z.object({ option: i18n, value: i18n, priceDeltaCents: z.number().int() })),
      spice_level: z.enum(["mild", "medium", "hot"]).nullable(),
      instructions: z.string().nullable(),
      sort_order: z.number().int(),
    }),
  ),
  order_status_events: z.array(z.object({ status: z.string(), created_at: z.string() })),
});

export type BoardOrder = Omit<
  z.infer<typeof boardOrderRow>,
  "order_items" | "order_status_events"
> & {
  items: {
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    details: string[];
    spiceLevel: "mild" | "medium" | "hot" | null;
    instructions: string | null;
  }[];
  /** When the order reached the branch (after payment, for online orders). */
  receivedAt: string;
};

const ORDER_COLUMNS = `id, order_number, status, type, scheduled_for, customer_name, customer_phone,
  delivery_address, delivery_landmark, delivery_city, delivery_lat, delivery_lng, notes,
  subtotal_cents, discount_cents, service_charge_cents, vat_cents, delivery_fee_cents, total_cents,
  payment_method, payment_status, rejection_reason, created_at, updated_at,
  order_items (name_i18n, quantity, unit_price_cents, line_total_cents, options, spice_level, instructions, sort_order),
  order_status_events (status, created_at)`;

function toBoardOrder(raw: unknown): BoardOrder {
  const { order_items, order_status_events, ...order } = boardOrderRow.parse(raw);
  const received = order_status_events.find((e) => e.status === "received");
  return {
    ...order,
    receivedAt: received?.created_at ?? order.created_at,
    items: [...order_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        name: localize(item.name_i18n, "en"),
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
        details: item.options.map((o) => localize(o.value, "en")),
        spiceLevel: item.spice_level,
        instructions: item.instructions,
      })),
  };
}

/** Today's board: open orders, plus orders finished in the last 12 hours. */
export async function getBoardOrders(branchId: string): Promise<BoardOrder[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("branch_id", branchId)
    .neq("status", "awaiting_payment")
    .or(`status.in.(received,accepted,preparing,ready,out_for_delivery),updated_at.gte.${since}`)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return (data ?? []).map(toBoardOrder);
}

/** One order for printing, if this staff member can see it (RLS). */
export async function getBoardOrder(
  orderId: string,
): Promise<(BoardOrder & { branchId: string }) | null> {
  if (!z.uuid().safeParse(orderId).success) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`branch_id, ${ORDER_COLUMNS}`)
    .eq("id", orderId)
    .neq("status", "awaiting_payment")
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  if (!data) return null;
  const { branch_id: branchId, ...rest } = data as { branch_id: string } & Record<string, unknown>;
  return { ...toBoardOrder(rest), branchId };
}

/**
 * The branch's live board topic. The key is secret; only call this after
 * checking the staff member may see the branch.
 */
export async function getBoardTopic(branchId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("branch_secrets")
    .select("realtime_key")
    .eq("branch_id", branchId)
    .maybeSingle();
  if (error || !data) return null;
  return `staff:${(data as { realtime_key: string }).realtime_key}`;
}

export type MenuAvailability = {
  categoryName: string;
  items: { id: string; name: string; available: boolean }[];
}[];

/** Every dish with its availability at the branch, by category. */
export async function getBranchAvailability(branchId: string): Promise<MenuAvailability> {
  const rows = await getPublicRows();
  const unavailable = new Set(
    rows.overrides
      .filter((o) => o.branch_id === branchId && !o.is_available)
      .map((o) => o.menu_item_id),
  );
  return rows.categories
    .map((category) => ({
      categoryName: localize(category.name_i18n, "en"),
      items: rows.items
        .filter((item) => item.category_id === category.id)
        .map((item) => ({
          id: item.id,
          name: localize(item.name_i18n, "en"),
          available: !unavailable.has(item.id),
        })),
    }))
    .filter((c) => c.items.length > 0);
}
