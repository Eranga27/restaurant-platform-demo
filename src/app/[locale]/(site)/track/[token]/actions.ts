"use server";

import { reviewInput, submitReview, type SubmitReviewResult } from "@/lib/reviews/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

/** A review from the tracking page. The token proves the order; one review each. */
export async function submitReviewAction(
  input: unknown,
): Promise<SubmitReviewResult | { ok: false; error: "invalid" | "rate-limited" }> {
  const parsed = reviewInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const limit = await rateLimit("guest", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  return submitReview(parsed.data);
}
