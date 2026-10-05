"use server";

import { z } from "zod";

import { availabilityRequestSchema, bookingSchema } from "@/lib/reservations/schema";
import {
  bookTable,
  cancelReservation,
  getAvailability,
  reservationPath,
} from "@/lib/reservations/service";
import type { SlotAvailability } from "@/lib/reservations/slots";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Booking endpoints. Inputs are validated with Zod and every action is rate
 * limited by IP. Availability reveals only free or full, never who booked.
 */

export async function availabilityAction(
  input: unknown,
): Promise<
  { ok: true; slots: SlotAvailability[] } | { ok: false; error: "invalid" | "rate-limited" }
> {
  const parsed = availabilityRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const limit = await rateLimit("availability", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  return { ok: true, slots: await getAvailability(parsed.data) };
}

export type BookTableResponse =
  | { ok: true; path: string }
  | { ok: false; error: "invalid"; fields: string[] }
  | {
      ok: false;
      error:
        "fully-booked" | "slot-invalid" | "rate-limited" | "bot-check" | "unavailable" | "unknown";
    };

export async function bookTableAction(input: unknown): Promise<BookTableResponse> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))],
    };
  }
  const ip = await clientIp();
  const limit = await rateLimit("booking", ip ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip)))
    return { ok: false, error: "bot-check" };

  const user = await getCurrentUser();
  const result = await bookTable(parsed.data, { userId: user?.id ?? null });
  return result.ok
    ? { ok: true, path: reservationPath(result.token, parsed.data.locale) }
    : { ok: false, error: result.reason };
}

export async function cancelReservationAction(token: unknown): Promise<{ ok: boolean }> {
  const parsed = z
    .string()
    .regex(/^[A-Za-z0-9_-]{32,64}$/)
    .safeParse(token);
  if (!parsed.success) return { ok: false };
  const limit = await rateLimit("guest", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false };
  return { ok: await cancelReservation(parsed.data) };
}
