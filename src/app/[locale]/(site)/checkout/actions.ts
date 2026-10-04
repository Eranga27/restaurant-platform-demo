"use server";

import { z } from "zod";

import { localize } from "@/lib/data/catalogue";
import type { Quote, QuoteIssue } from "@/lib/orders/quote";
import { checkoutSchema, quoteRequestSchema } from "@/lib/orders/schema";
import { getQuote, placeOrder, trackingPath } from "@/lib/orders/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Checkout endpoints. Server Actions are public HTTP endpoints, so every input
 * is validated with Zod, prices come only from the database, and both actions
 * are rate limited by IP.
 */

const locale = z.enum(["en", "si", "ta"]);

export type QuoteView = {
  lines: { lineIndex: number; name: string; quantity: number; lineTotalCents: number }[];
  totals: Quote["totals"];
  distanceKm: number | null;
  promoCode: string | null;
  issues: QuoteIssue[];
};

export type QuoteResponse =
  { ok: true; quote: QuoteView } | { ok: false; error: "invalid" | "rate-limited" };

function toView(quote: Quote, lang: z.infer<typeof locale>): QuoteView {
  return {
    lines: quote.lines.map((l) => ({
      lineIndex: l.lineIndex,
      name: localize(l.name, lang),
      quantity: l.quantity,
      lineTotalCents: l.lineTotalCents,
    })),
    totals: quote.totals,
    distanceKm: quote.distanceKm,
    promoCode: quote.promo?.code ?? null,
    issues: quote.issues,
  };
}

export async function quoteAction(input: unknown, lang: unknown): Promise<QuoteResponse> {
  const parsed = quoteRequestSchema.safeParse(input);
  const parsedLocale = locale.safeParse(lang);
  if (!parsed.success || !parsedLocale.success) return { ok: false, error: "invalid" };

  const limit = await rateLimit("quote", (await clientIp()) ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };

  return { ok: true, quote: toView(await getQuote(parsed.data), parsedLocale.data) };
}

export type PlaceOrderResponse =
  | { ok: true; trackingPath: string }
  | { ok: false; error: "invalid"; fields: string[] }
  | { ok: false; error: "issues"; quote: QuoteView }
  | {
      ok: false;
      error: "rate-limited" | "bot-check" | "promo-exhausted" | "unavailable" | "unknown";
    };

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResponse> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")))],
    };
  }
  const request = parsed.data;

  const ip = await clientIp();
  const limit = await rateLimit("checkout", ip ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  if (!(await verifyTurnstile(request.turnstileToken, ip)))
    return { ok: false, error: "bot-check" };

  const user = await getCurrentUser();
  const result = await placeOrder(request, { userId: user?.id ?? null });

  if (result.ok)
    return { ok: true, trackingPath: trackingPath(result.publicToken, request.locale) };
  if (result.reason === "issues")
    return { ok: false, error: "issues", quote: toView(result.quote, request.locale) };
  return { ok: false, error: result.reason };
}
