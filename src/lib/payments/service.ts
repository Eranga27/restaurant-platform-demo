import "server-only";

import { after } from "next/server";
import { z } from "zod";

import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { env } from "@/lib/env";
import { eventPath, sendEventEmail } from "@/lib/events/service";
import { alertBranchOfNewOrder } from "@/lib/notifications/new-order";
import { orderingEnabled, sendOrderConfirmation, trackingPath } from "@/lib/orders/service";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  checkoutHash,
  formatPayHereAmount,
  localPhone,
  parsePayHereAmount,
  payhereCheckoutUrl,
  payhereText,
  splitName,
  verifyNotificationSignature,
  type PaymentForm,
} from "./payhere";

export type { PaymentForm };

type PayHereConfig = { merchantId: string; merchantSecret: string; sandbox: boolean };

/** PayHere settings, or null when online payments aren't set up (docs/DECISIONS.md D9). */
export function payhereConfig(): PayHereConfig | null {
  const e = env();
  if (!e.PAYHERE_MERCHANT_ID || !e.PAYHERE_MERCHANT_SECRET) return null;
  return {
    merchantId: e.PAYHERE_MERCHANT_ID,
    merchantSecret: e.PAYHERE_MERCHANT_SECRET,
    sandbox: e.PAYHERE_SANDBOX,
  };
}

/** True when customers can pay online: PayHere is configured and orders can be stored. */
export function onlinePaymentsEnabled(): boolean {
  return payhereConfig() !== null && orderingEnabled();
}

export function payPath(token: string, locale: Locale): string {
  return `${locale === "en" ? "" : `/${locale}`}/pay/${token}`;
}

// ---------------------------------------------------------------------------
// Starting a payment
// ---------------------------------------------------------------------------

export type StartPaymentResult =
  | { ok: true; form: PaymentForm }
  | { ok: false; reason: "not-needed" | "attempts-exhausted" | "unavailable" | "unknown" };

const payableOrder = z.object({
  order_number: z.string(),
  public_token: z.string(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().nullable(),
  type: z.enum(["delivery", "pickup"]),
  delivery_address: z.string().nullable(),
  delivery_city: z.string().nullable(),
  locale: z.enum(["en", "si", "ta"]),
  branches: z.object({ address_line: z.string(), city: z.string() }),
});

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/**
 * Opens a new payment attempt for an order waiting for payment and returns the
 * signed PayHere form. The amount is the stored order total, never a value
 * from the browser.
 */
export async function startPayment(token: string): Promise<StartPaymentResult> {
  const config = payhereConfig();
  if (!config || !orderingEnabled()) return { ok: false, reason: "unavailable" };
  if (!TOKEN.test(token)) return { ok: false, reason: "not-needed" };

  const supabase = createAdminClient();
  const { data: attempt, error } = await supabase
    .rpc("start_payment", { order_token: token })
    .single<{ payment_id: string; reference: string; amount_cents: number }>();
  if (error || !attempt) {
    if (error?.message.includes("payment_not_needed") || error?.message.includes("order_not_found"))
      return { ok: false, reason: "not-needed" };
    if (error?.message.includes("payment_attempts_exhausted"))
      return { ok: false, reason: "attempts-exhausted" };
    console.error("[payment] start_payment failed", error?.code, error?.message);
    return { ok: false, reason: "unknown" };
  }

  const { data, error: loadError } = await supabase
    .from("orders")
    .select(
      "order_number, public_token, customer_name, customer_phone, customer_email, type, delivery_address, delivery_city, locale, branches (address_line, city)",
    )
    .eq("public_token", token)
    .single();
  if (loadError || !data) {
    console.error("[payment] order load failed", loadError?.message);
    return { ok: false, reason: "unknown" };
  }
  const order = payableOrder.parse(data);
  const brand = await getBrand();
  const base = publicEnv.siteUrl;
  return {
    ok: true,
    form: payhereForm(config, {
      reference: attempt.reference,
      amountCents: attempt.amount_cents,
      items: `${brand.name} order ${order.order_number}`,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email ?? "",
        address:
          order.type === "delivery"
            ? (order.delivery_address ?? "")
            : `Pickup: ${order.branches.address_line}`,
        city: (order.type === "delivery" ? order.delivery_city : order.branches.city) ?? "",
      },
      returnUrl: `${base}${trackingPath(order.public_token, order.locale)}?payment=return`,
      cancelUrl: `${base}${payPath(order.public_token, order.locale)}?payment=cancelled`,
    }),
  };
}

/** The signed PayHere checkout form for one payment attempt. */
function payhereForm(
  config: PayHereConfig,
  payment: {
    reference: string;
    amountCents: number;
    items: string;
    customer: { name: string; phone: string; email: string; address: string; city: string };
    returnUrl: string;
    cancelUrl: string;
  },
): PaymentForm {
  const name = splitName(payment.customer.name);
  const currency = "LKR";
  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    return_url: payment.returnUrl,
    cancel_url: payment.cancelUrl,
    notify_url: `${publicEnv.siteUrl}/api/payments/payhere/notify`,
    order_id: payment.reference,
    items: payhereText(payment.items),
    currency,
    amount: formatPayHereAmount(payment.amountCents),
    first_name: payhereText(name.first, 50),
    last_name: payhereText(name.last, 50),
    email: payment.customer.email,
    phone: localPhone(payment.customer.phone),
    address: payhereText(payment.customer.address),
    city: payhereText(payment.customer.city, 50),
    country: "Sri Lanka",
    hash: checkoutHash(
      {
        merchantId: config.merchantId,
        orderId: payment.reference,
        amountCents: payment.amountCents,
        currency,
      },
      config.merchantSecret,
    ),
  };
  return { action: payhereCheckoutUrl(config.sandbox), fields };
}

// ---------------------------------------------------------------------------
// Event deposits
// ---------------------------------------------------------------------------

const depositInquiry = z.object({
  reference: z.string(),
  public_token: z.string(),
  contact_name: z.string(),
  contact_phone: z.string(),
  contact_email: z.string(),
  service: z.enum(["at_branch", "catering"]),
  venue: z.string().nullable(),
  locale: z.enum(["en", "si", "ta"]),
  branches: z.object({ address_line: z.string(), city: z.string() }),
});

/** A new deposit attempt for an accepted event quote, as a signed PayHere form. */
export async function startDepositPayment(token: string): Promise<StartPaymentResult> {
  const config = payhereConfig();
  if (!config || !orderingEnabled()) return { ok: false, reason: "unavailable" };
  if (!TOKEN.test(token)) return { ok: false, reason: "not-needed" };

  const supabase = createAdminClient();
  const { data: attempt, error } = await supabase
    .rpc("start_deposit_payment", { inquiry_token: token })
    .single<{ payment_id: string; reference: string; amount_cents: number }>();
  if (error || !attempt) {
    if (error?.message.includes("deposit_not_due") || error?.message.includes("inquiry_not_found"))
      return { ok: false, reason: "not-needed" };
    if (error?.message.includes("payment_attempts_exhausted"))
      return { ok: false, reason: "attempts-exhausted" };
    console.error("[payment] start_deposit_payment failed", error?.code, error?.message);
    return { ok: false, reason: "unknown" };
  }

  const { data, error: loadError } = await supabase
    .from("event_inquiries")
    .select(
      "reference, public_token, contact_name, contact_phone, contact_email, service, venue, locale, branches (address_line, city)",
    )
    .eq("public_token", token)
    .single();
  if (loadError || !data) {
    console.error("[payment] enquiry load failed", loadError?.message);
    return { ok: false, reason: "unknown" };
  }
  const inquiry = depositInquiry.parse(data);
  const brand = await getBrand();
  const page = `${publicEnv.siteUrl}${eventPath(inquiry.public_token, inquiry.locale)}`;
  return {
    ok: true,
    form: payhereForm(config, {
      reference: attempt.reference,
      amountCents: attempt.amount_cents,
      items: `${brand.name} event deposit ${inquiry.reference}`,
      customer: {
        name: inquiry.contact_name,
        phone: inquiry.contact_phone,
        email: inquiry.contact_email,
        address:
          inquiry.service === "catering" && inquiry.venue
            ? inquiry.venue
            : inquiry.branches.address_line,
        city: inquiry.branches.city,
      },
      returnUrl: `${page}?payment=return`,
      cancelUrl: `${page}?payment=cancelled`,
    }),
  };
}

// ---------------------------------------------------------------------------
// Payment notifications (PayHere → notify_url)
// ---------------------------------------------------------------------------

const notificationSchema = z.object({
  merchant_id: z.string().min(1).max(20),
  order_id: z.string().regex(/^[A-Z0-9]{6}-[0-9]{1,2}$/),
  payment_id: z.string().max(64).optional(),
  payhere_amount: z.string().max(16),
  payhere_currency: z.string().max(3),
  status_code: z.enum(["2", "0", "-1", "-2", "-3"]),
  md5sig: z.string().regex(/^[0-9A-Fa-f]{32}$/),
  method: z.string().max(32).optional(),
  status_message: z.string().max(500).optional(),
});

/** Card details aren't needed, so they're never stored (docs/DECISIONS.md D31). */
const NOT_STORED = new Set(["card_holder_name", "card_no", "card_expiry", "md5sig"]);

export type NotificationResult =
  { ok: true; outcome: string } | { ok: false; status: 400 | 401 | 404 | 500; reason: string };

export async function handlePayHereNotification(
  params: URLSearchParams,
): Promise<NotificationResult> {
  const config = payhereConfig();
  if (!config || !orderingEnabled()) return { ok: false, status: 404, reason: "not configured" };

  const parsed = notificationSchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return { ok: false, status: 400, reason: "malformed" };
  const n = parsed.data;

  if (n.merchant_id !== config.merchantId || !verifyNotificationSignature(n, config.merchantSecret))
    return { ok: false, status: 401, reason: "bad signature" };

  const amountCents = parsePayHereAmount(n.payhere_amount);
  if (amountCents === null) return { ok: false, status: 400, reason: "malformed amount" };

  const raw = Object.fromEntries([...params].filter(([key]) => !NOT_STORED.has(key)));
  const { data, error } = await createAdminClient()
    .rpc("apply_payhere_notification", {
      payload: {
        reference: n.order_id,
        payment_id: n.payment_id ?? null,
        amount_cents: amountCents,
        currency: n.payhere_currency,
        status_code: Number(n.status_code),
        method: n.method ?? null,
        status_message: n.status_message ?? null,
        raw,
      },
    })
    .single<{
      outcome: string;
      kind: "order" | "deposit" | null;
      token: string | null;
      payment_status: string | null;
      status: string | null;
    }>();
  if (error || !data) {
    console.error("[payment] apply_payhere_notification failed", error?.code, error?.message);
    return { ok: false, status: 500, reason: "not applied" };
  }

  if (data.outcome === "amount_mismatch" || data.outcome === "paid_after_cancel") {
    // Needs a person: Phase 6 lists these in the admin panel for a refund.
    console.error(`[payment] ${data.outcome} for ${n.order_id}`);
  }
  if (data.outcome === "applied" && data.payment_status === "paid" && data.token) {
    const token = data.token;
    if (data.kind === "deposit") {
      after(() =>
        sendEventEmail(token, "confirmed").catch((e) =>
          console.error("[payment] event email failed", e),
        ),
      );
    } else {
      const reachedBranch = data.status === "received";
      after(() =>
        Promise.all([
          sendOrderConfirmation(token).catch((e) => console.error("[payment] email failed", e)),
          reachedBranch
            ? alertBranchOfNewOrder(token).catch((e) => console.error("[payment] alert failed", e))
            : null,
        ]),
      );
    }
  }
  return { ok: true, outcome: data.outcome };
}

// ---------------------------------------------------------------------------
// Paying in cash instead
// ---------------------------------------------------------------------------

export async function payOnDeliveryInstead(token: string): Promise<boolean> {
  if (!TOKEN.test(token) || !orderingEnabled()) return false;
  const brand = await getBrand();
  if (!brand.features.cashOnDelivery) return false;

  const { data, error } = await createAdminClient().rpc("pay_on_delivery_instead", {
    order_token: token,
  });
  if (error) {
    console.error("[payment] pay_on_delivery_instead failed", error.code, error.message);
    return false;
  }
  if (data === true) {
    after(() =>
      Promise.all([
        sendOrderConfirmation(token).catch((e) => console.error("[payment] email failed", e)),
        alertBranchOfNewOrder(token).catch((e) => console.error("[payment] alert failed", e)),
      ]),
    );
  }
  return data === true;
}
