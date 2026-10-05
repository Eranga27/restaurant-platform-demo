"use server";

import { after } from "next/server";
import { z } from "zod";

import { canActForBranch, getStaff } from "@/lib/auth/staff";
import { sendEventEmail } from "@/lib/events/service";
import { refreshPublicSite } from "@/lib/revalidate";
import { sendReservationEmail } from "@/lib/reservations/service";
import { createClient } from "@/lib/supabase/server";

/**
 * Dashboard actions. Each one checks the signed-in user is staff for the
 * branch, validates its input, then calls a database function as that user;
 * the function checks the branch and the allowed change again.
 */

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not-allowed"
        | "invalid"
        | "invalid-transition"
        | "reason-required"
        | "invalid-quote"
        | "unknown";
    };

function fail(message: string | undefined): ActionResult {
  if (message?.includes("not_allowed")) return { ok: false, error: "not-allowed" };
  if (message?.includes("invalid_transition")) return { ok: false, error: "invalid-transition" };
  if (message?.includes("reason_required")) return { ok: false, error: "reason-required" };
  if (message?.includes("invalid_quote")) return { ok: false, error: "invalid-quote" };
  console.error("[dashboard] action failed", message);
  return { ok: false, error: "unknown" };
}

const statusInput = z.object({
  orderId: z.uuid(),
  next: z.enum([
    "accepted",
    "rejected",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "cancelled",
  ]),
  reason: z.string().trim().max(300).nullable(),
});

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "not-allowed" };
  const parsed = statusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    target: parsed.data.orderId,
    next_status: parsed.data.next,
    reason: parsed.data.reason,
  });
  return error ? fail(error.message) : { ok: true };
}

const availabilityInput = z.object({
  branchId: z.uuid(),
  menuItemId: z.uuid(),
  available: z.boolean(),
});

export async function setAvailabilityAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  const parsed = availabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!staff || !canActForBranch(staff, parsed.data.branchId))
    return { ok: false, error: "not-allowed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_item_availability", {
    target_branch: parsed.data.branchId,
    item: parsed.data.menuItemId,
    available: parsed.data.available,
  });
  if (error) return fail(error.message);
  // The public menu is cached for a few minutes; show the change now.
  refreshPublicSite();
  return { ok: true };
}

const acceptingInput = z.object({ branchId: z.uuid(), accepting: z.boolean() });

export async function setAcceptingOrdersAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  const parsed = acceptingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!staff || !canActForBranch(staff, parsed.data.branchId))
    return { ok: false, error: "not-allowed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_branch_accepting_orders", {
    target_branch: parsed.data.branchId,
    accepting: parsed.data.accepting,
  });
  if (error) return fail(error.message);
  refreshPublicSite();
  return { ok: true };
}

// Only the browsers' own push services: the server posts to this URL, so an
// arbitrary one would be a server-side request forgery hole (OWASP A10).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

const pushInput = z.object({
  endpoint: z
    .url()
    .max(1000)
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(url.hostname));
    }),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "not-allowed" };
  const parsed = pushInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  // A browser keeps its endpoint; replace any earlier copy of it.
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: staff.userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
  });
  return error ? fail(error.message) : { ok: true };
}

export async function deletePushSubscriptionAction(endpoint: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "not-allowed" };
  const parsed = z.url().max(1000).safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
  return error ? fail(error.message) : { ok: true };
}

// ---------------------------------------------------------------------------
// Reservations and events
// ---------------------------------------------------------------------------

const reservationInput = z.object({
  reservationId: z.uuid(),
  next: z.enum(["seated", "completed", "no_show", "cancelled"]),
  reason: z.string().trim().max(300).nullable(),
});

export async function updateReservationStatusAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "not-allowed" };
  const parsed = reservationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_reservation_status", {
    target: parsed.data.reservationId,
    next_status: parsed.data.next,
    reason: parsed.data.reason,
  });
  if (error) return fail(error.message);
  if (parsed.data.next === "cancelled") {
    const { data } = await supabase
      .from("reservations")
      .select("public_token")
      .eq("id", parsed.data.reservationId)
      .maybeSingle();
    const token = (data as { public_token: string } | null)?.public_token;
    if (token) {
      after(() =>
        sendReservationEmail(token, "cancelled").catch((e) =>
          console.error("[dashboard] email failed", e),
        ),
      );
    }
  }
  return { ok: true };
}

const quoteInput = z.object({
  inquiryId: z.uuid(),
  quoteCents: z.number().int().min(1).max(1_000_000_000),
  depositCents: z.number().int().min(0).max(1_000_000_000),
  notes: z.string().trim().max(1000).nullable(),
});

/** Managers and admins send a quote; the guest gets it by email. */
export async function quoteEventAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff || staff.role === "staff") return { ok: false, error: "not-allowed" };
  const parsed = quoteInput.safeParse(input);
  if (!parsed.success || parsed.data.depositCents > parsed.data.quoteCents)
    return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("quote_event_inquiry", {
    target: parsed.data.inquiryId,
    quote: parsed.data.quoteCents,
    deposit: parsed.data.depositCents,
    quote_note: parsed.data.notes,
  });
  if (error) return fail(error.message);
  await emailGuest(parsed.data.inquiryId, "quoted");
  return { ok: true };
}

const eventStatusInput = z.object({
  inquiryId: z.uuid(),
  next: z.enum(["declined", "confirmed", "done", "cancelled"]),
  reason: z.string().trim().max(300).nullable(),
});

export async function setEventStatusAction(input: unknown): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff || staff.role === "staff") return { ok: false, error: "not-allowed" };
  const parsed = eventStatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_event_status", {
    target: parsed.data.inquiryId,
    next_status: parsed.data.next,
    reason: parsed.data.reason,
  });
  if (error) return fail(error.message);
  if (parsed.data.next === "declined") await emailGuest(parsed.data.inquiryId, "declined");
  if (parsed.data.next === "confirmed") await emailGuest(parsed.data.inquiryId, "confirmed");
  return { ok: true };
}

async function emailGuest(inquiryId: string, kind: "quoted" | "declined" | "confirmed") {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_inquiries")
    .select("public_token")
    .eq("id", inquiryId)
    .maybeSingle();
  const token = (data as { public_token: string } | null)?.public_token;
  if (!token) return;
  after(() =>
    sendEventEmail(token, kind).catch((e) => console.error("[dashboard] email failed", e)),
  );
}
