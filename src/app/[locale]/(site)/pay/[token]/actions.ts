"use server";

import { z } from "zod";

import type { PaymentForm } from "@/lib/payments/payhere";
import { payOnDeliveryInstead, startPayment } from "@/lib/payments/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

/**
 * Pay page endpoints. The tracking token is the only credential, as on the
 * tracking page; both actions are rate limited by IP, and the database caps
 * an order at 10 payment attempts.
 */

const token = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

export type StartPaymentResponse =
  | { ok: true; payment: PaymentForm }
  | {
      ok: false;
      error: "rate-limited" | "not-needed" | "attempts-exhausted" | "unavailable" | "unknown";
    };

export async function startPaymentAction(input: unknown): Promise<StartPaymentResponse> {
  const parsed = token.safeParse(input);
  if (!parsed.success) return { ok: false, error: "not-needed" };

  const limit = await rateLimit("payment", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };

  const result = await startPayment(parsed.data);
  return result.ok ? { ok: true, payment: result.form } : { ok: false, error: result.reason };
}

export async function payOnDeliveryAction(
  input: unknown,
): Promise<{ ok: boolean; error?: "rate-limited" }> {
  const parsed = token.safeParse(input);
  if (!parsed.success) return { ok: false };

  const limit = await rateLimit("payment", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };

  return { ok: await payOnDeliveryInstead(parsed.data) };
}
