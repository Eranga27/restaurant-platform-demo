"use server";

import { z } from "zod";

import { getBrand } from "@/lib/data/brand";
import { localize } from "@/lib/data/catalogue";
import type { Quote, QuoteIssue } from "@/lib/orders/quote";
import { checkoutSchema, quoteRequestSchema } from "@/lib/orders/schema";
import { getQuote, placeOrder, trackingPath } from "@/lib/orders/service";
import {
  onlinePaymentsEnabled,
  payPath,
  startPayment,
  type PaymentForm,
} from "@/lib/payments/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { saveAddress } from "@/lib/account/addresses";
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

  // Points need the signed-in customer; only look them up when asked to spend some.
  const user = (parsed.data.loyaltyPoints ?? 0) > 0 ? await getCurrentUser() : null;
  return {
    ok: true,
    quote: toView(await getQuote(parsed.data, { userId: user?.id ?? null }), parsedLocale.data),
  };
}

export type PlaceOrderResponse =
  /** `payment`: post this form to PayHere. Without it, go to `nextPath`. */
  | { ok: true; nextPath: string; payment: PaymentForm | null }
  | { ok: false; error: "invalid"; fields: string[] }
  | { ok: false; error: "issues"; quote: QuoteView }
  | {
      ok: false;
      error:
        | "rate-limited"
        | "bot-check"
        | "promo-exhausted"
        | "loyalty-changed"
        | "payment-unavailable"
        | "unavailable"
        | "unknown";
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

  const brand = await getBrand();
  const methodAvailable =
    request.paymentMethod === "payhere" ? onlinePaymentsEnabled() : brand.features.cashOnDelivery;
  if (!methodAvailable) return { ok: false, error: "payment-unavailable" };

  const ip = await clientIp();
  const limit = await rateLimit("checkout", ip ?? "unknown");
  if (!limit.ok) return { ok: false, error: "rate-limited" };
  if (!(await verifyTurnstile(request.turnstileToken, ip)))
    return { ok: false, error: "bot-check" };

  const user = await getCurrentUser();
  const result = await placeOrder(request, { userId: user?.id ?? null });

  if (result.ok && user && request.saveAddressAs && request.address && request.location) {
    await saveAddress({
      label: request.saveAddressAs,
      ...request.address,
      ...request.location,
    }).catch((e) => console.error("[checkout] saving the address failed", e));
  }

  if (result.ok) {
    if (request.paymentMethod === "cod") {
      return {
        ok: true,
        nextPath: trackingPath(result.publicToken, request.locale),
        payment: null,
      };
    }
    // Straight on to PayHere. If that can't start, the pay page offers a retry.
    const payment = await startPayment(result.publicToken);
    return {
      ok: true,
      nextPath: payPath(result.publicToken, request.locale),
      payment: payment.ok ? payment.form : null,
    };
  }
  if (result.reason === "issues")
    return { ok: false, error: "issues", quote: toView(result.quote, request.locale) };
  return { ok: false, error: result.reason };
}
