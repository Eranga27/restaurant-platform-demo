import "server-only";

import { z } from "zod";

import { orderingEnabled } from "@/lib/orders/service";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reviews of completed orders, left from the order's tracking link (guests
 * included). Each waits for an admin to approve it before it's shown (D60).
 */

export async function getReviewForOrder(
  orderId: string,
): Promise<{ rating: number; status: string } | null> {
  if (!orderingEnabled()) return null;
  const { data } = await createAdminClient()
    .from("reviews")
    .select("rating, status")
    .eq("order_id", orderId)
    .maybeSingle();
  return (data as { rating: number; status: string } | null) ?? null;
}

export const reviewInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32,64}$/),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
  name: z.string().trim().min(1).max(80),
});

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; error: "not-reviewable" | "already-reviewed" | "too-late" | "unknown" };

export async function submitReview(
  input: z.infer<typeof reviewInput>,
): Promise<SubmitReviewResult> {
  const { error } = await createAdminClient().rpc("submit_review", {
    order_token: input.token,
    stars: input.rating,
    review_body: input.body,
    author: input.name,
  });
  if (!error) return { ok: true };
  if (error.message.includes("already_reviewed")) return { ok: false, error: "already-reviewed" };
  if (error.message.includes("too_late")) return { ok: false, error: "too-late" };
  if (error.message.includes("not_reviewable")) return { ok: false, error: "not-reviewable" };
  console.error("[reviews] submit failed", error.code, error.message);
  return { ok: false, error: "unknown" };
}
