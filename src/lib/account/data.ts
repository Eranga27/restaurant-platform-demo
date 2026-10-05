import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { Locale } from "@/i18n/routing";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * The signed-in customer's own data, read with their session: RLS returns
 * only their rows (orders, bookings, enquiries, points, addresses).
 */

/** For account pages: the signed-in user, or a redirect to sign in and come back. */
export async function requireCustomer(path: string, locale: Locale) {
  const user = await getCurrentUser();
  if (!user) {
    const prefix = locale === "en" ? "" : `/${locale}`;
    redirect(`${prefix}/login?next=${encodeURIComponent(path)}`);
  }
  return user;
}

export async function getProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { full_name: string | null; phone: string | null } | null;
  return { name: row?.full_name ?? "", phone: row?.phone ?? "" };
}

const ledgerRow = z.object({
  points: z.number().int(),
  reason: z.enum(["earned", "redeemed", "returned", "adjusted"]),
  created_at: z.string(),
  orders: z.object({ order_number: z.string() }).nullable(),
});

export async function getLoyalty() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_ledger")
    .select("points, reason, created_at, orders (order_number)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { balance: 0, entries: [] };
  const entries = z.array(ledgerRow).parse(data ?? []);
  return { balance: entries.reduce((sum, e) => sum + e.points, 0), entries: entries.slice(0, 20) };
}

const orderRow = z.object({
  id: z.uuid(),
  public_token: z.string(),
  order_number: z.string(),
  branch_id: z.uuid(),
  type: z.enum(["delivery", "pickup"]),
  status: z.enum([
    "awaiting_payment",
    "received",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "rejected",
    "cancelled",
  ]),
  total_cents: z.number().int(),
  created_at: z.string(),
  order_items: z.array(z.object({ quantity: z.number().int() })),
});

export type MyOrder = z.infer<typeof orderRow>;

export async function getMyOrders(userId: string): Promise<MyOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, public_token, order_number, branch_id, type, status, total_cents, created_at, order_items (quantity)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return z.array(orderRow).parse(data ?? []);
}

const reservationRow = z.object({
  public_token: z.string(),
  reference: z.string(),
  branch_id: z.uuid(),
  starts_at: z.string(),
  party_size: z.number().int(),
  status: z.enum(["confirmed", "seated", "completed", "no_show", "cancelled"]),
});

const inquiryRow = z.object({
  public_token: z.string(),
  reference: z.string(),
  branch_id: z.uuid(),
  event_type: z.enum(["birthday", "office", "dana", "wedding", "homecoming", "other"]),
  event_date: z.string(),
  guests: z.number().int(),
  status: z.enum(["new", "quoted", "confirmed", "done", "declined", "cancelled"]),
});

export async function getMyBookings(userId: string) {
  const supabase = await createClient();
  const [reservations, inquiries] = await Promise.all([
    supabase
      .from("reservations")
      .select("public_token, reference, branch_id, starts_at, party_size, status")
      .eq("user_id", userId)
      .order("starts_at", { ascending: false })
      .limit(50),
    supabase
      .from("event_inquiries")
      .select("public_token, reference, branch_id, event_type, event_date, guests, status")
      .eq("user_id", userId)
      .order("event_date", { ascending: false })
      .limit(50),
  ]);
  return {
    reservations: z.array(reservationRow).parse(reservations.data ?? []),
    inquiries: z.array(inquiryRow).parse(inquiries.data ?? []),
  };
}
