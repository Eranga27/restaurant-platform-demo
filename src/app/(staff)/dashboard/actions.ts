"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canActForBranch, getStaff } from "@/lib/auth/staff";
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
      error: "not-allowed" | "invalid" | "invalid-transition" | "reason-required" | "unknown";
    };

function fail(message: string | undefined): ActionResult {
  if (message?.includes("not_allowed")) return { ok: false, error: "not-allowed" };
  if (message?.includes("invalid_transition")) return { ok: false, error: "invalid-transition" };
  if (message?.includes("reason_required")) return { ok: false, error: "reason-required" };
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
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
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
