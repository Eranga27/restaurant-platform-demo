import "server-only";

import webpush from "web-push";
import { z } from "zod";

import { localize } from "@/lib/data/catalogue";
import { env } from "@/lib/env";
import { formatLKR } from "@/lib/money";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tells a branch about a new order: Web Push to its staff's devices and,
 * optionally, a Telegram message. Both are skipped when not configured
 * (docs/DECISIONS.md D9). Messages carry the order number, type, total and
 * item count only, never the customer's details (D39).
 */

const orderRow = z.object({
  order_number: z.string(),
  branch_id: z.uuid(),
  type: z.enum(["delivery", "pickup"]),
  scheduled_for: z.string().nullable(),
  total_cents: z.number().int(),
  payment_status: z.string(),
  branches: z.object({ name_i18n: z.object({ en: z.string() }) }),
  order_items: z.array(z.object({ quantity: z.number().int() })),
});

const subscriptionRow = z.object({
  id: z.uuid(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
});

export function webPushConfigured(): boolean {
  const e = env();
  return Boolean(publicEnv.vapidPublicKey && e.VAPID_PRIVATE_KEY && e.VAPID_SUBJECT);
}

/** `token`: the order's public token, which every caller already has. */
export async function alertBranchOfNewOrder(token: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_number, branch_id, type, scheduled_for, total_cents, payment_status, branches (name_i18n), order_items (quantity)",
    )
    .eq("public_token", token)
    .single();
  if (error || !data) {
    console.error("[alerts] order not found", error?.message);
    return;
  }
  const order = orderRow.parse(data);
  const items = order.order_items.reduce((n, i) => n + i.quantity, 0);
  const when = order.scheduled_for
    ? `for ${new Intl.DateTimeFormat("en-LK", {
        timeZone: "Asia/Colombo",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(order.scheduled_for))}`
    : "now";
  const title = `New ${order.type} order ${order.order_number}`;
  const body = [
    `${items} item${items === 1 ? "" : "s"}`,
    formatLKR(order.total_cents),
    order.payment_status === "paid" ? "paid online" : "cash",
    when,
  ].join(" · ");

  await alertBranch(order.branch_id, {
    title,
    body,
    url: "/dashboard",
    tag: order.order_number,
    branchName: localize(order.branches.name_i18n, "en"),
  });
}

/** Push and Telegram to a branch's team. The text must not contain customer details. */
export async function alertBranch(
  branchId: string,
  message: { title: string; body: string; url: string; tag: string; branchName: string },
): Promise<void> {
  const { branchName, ...push } = message;
  await Promise.allSettled([
    sendPush(branchId, push),
    sendTelegram(branchId, `${message.title} at ${branchName}\n${message.body}`),
  ]);
}

async function sendPush(
  branchId: string,
  message: { title: string; body: string; url: string; tag: string },
): Promise<void> {
  if (!webPushConfigured()) return;
  const e = env();
  const supabase = createAdminClient();
  // Staff and managers of this branch. Admins aren't paged for every branch.
  const { data: staff } = await supabase
    .from("profiles")
    .select("id")
    .eq("branch_id", branchId)
    .in("role", ["staff", "manager"]);
  const userIds = (staff ?? []).map((s) => (s as { id: string }).id);
  if (userIds.length === 0) return;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  const subscriptions = z.array(subscriptionRow).parse(data ?? []);
  const payload = JSON.stringify(message);

  await Promise.allSettled(
    subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            TTL: 15 * 60,
            urgency: "high",
            vapidDetails: {
              subject: e.VAPID_SUBJECT!,
              publicKey: publicEnv.vapidPublicKey!,
              privateKey: e.VAPID_PRIVATE_KEY!,
            },
          },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Gone or unknown: the browser dropped this subscription.
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[alerts] push failed", status);
        }
      }
    }),
  );
}

async function sendTelegram(branchId: string, text: string): Promise<void> {
  const token = env().TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const { data } = await createAdminClient()
    .from("branch_secrets")
    .select("telegram_chat_id")
    .eq("branch_id", branchId)
    .maybeSingle();
  const chatId = (data as { telegram_chat_id: string | null } | null)?.telegram_chat_id;
  if (!chatId) return;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) console.error("[alerts] telegram failed", response.status);
}
