"use server";

import { z } from "zod";

import { inquirySchema } from "@/lib/events/schema";
import { createInquiry, eventPath, respondToQuote } from "@/lib/events/service";
import type { PaymentForm } from "@/lib/payments/payhere";
import { startDepositPayment } from "@/lib/payments/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getCurrentUser } from "@/lib/supabase/server";

/** Event enquiry endpoints: validated, rate limited, and bot-checked where public. */

const token = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

export type InquiryResponse =
  | { ok: true; path: string }
  | { ok: false; error: "invalid"; fields: string[] }
  | { ok: false; error: "rate-limited" | "bot-check" | "unavailable" | "unknown" };

export async function createInquiryAction(input: unknown): Promise<InquiryResponse> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))],
    };
  }
  const ip = await clientIp();
  const limit = await rateLimit("event", ip ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip)))
    return { ok: false, error: "bot-check" };

  const user = await getCurrentUser();
  const result = await createInquiry(parsed.data, { userId: user?.id ?? null });
  if (result.ok) return { ok: true, path: eventPath(result.token, parsed.data.locale) };
  return result.reason === "invalid"
    ? { ok: false, error: "invalid", fields: [] }
    : { ok: false, error: result.reason };
}

export async function respondToQuoteAction(
  input: unknown,
  accept: unknown,
): Promise<{ ok: boolean; status?: "confirmed" | "quoted" | "cancelled" }> {
  const parsed = token.safeParse(input);
  if (!parsed.success || typeof accept !== "boolean") return { ok: false };
  const limit = await rateLimit("guest", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false };
  const status = await respondToQuote(parsed.data, accept);
  return status ? { ok: true, status } : { ok: false };
}

export type DepositResponse =
  | { ok: true; payment: PaymentForm }
  | {
      ok: false;
      error: "rate-limited" | "not-needed" | "attempts-exhausted" | "unavailable" | "unknown";
    };

export async function startDepositAction(input: unknown): Promise<DepositResponse> {
  const parsed = token.safeParse(input);
  if (!parsed.success) return { ok: false, error: "not-needed" };
  const limit = await rateLimit("payment", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  const result = await startDepositPayment(parsed.data);
  return result.ok ? { ok: true, payment: result.form } : { ok: false, error: result.reason };
}
