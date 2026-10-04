import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { after } from "next/server";
import { createTranslator } from "next-intl";
import { z } from "zod";

import * as seed from "@/data/seed";
import { OrderConfirmationEmail } from "@/emails/order-confirmation";
import { loadMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { localize } from "@/lib/data/catalogue";
import { getPublicRows } from "@/lib/data/source";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";
import { formatLKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { publicEnv } from "@/lib/public-env";
import { createAdminClient } from "@/lib/supabase/admin";

import { quoteOrder, type PromoRecord, type Quote, type QuoteIssue } from "./quote";
import type { CheckoutRequest, QuoteRequest } from "./schema";

/** True when orders can actually be stored (Supabase with the secret key). */
export function orderingEnabled(): boolean {
  const e = env();
  return Boolean(
    e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && e.SUPABASE_SECRET_KEY,
  );
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function getQuote(request: QuoteRequest, now = new Date()): Promise<Quote> {
  const [rows, brand, promo] = await Promise.all([
    getPublicRows(),
    getBrand(),
    request.promoCode ? findPromo(request.promoCode) : Promise.resolve(null),
  ]);
  return quoteOrder(request, {
    rows,
    charges: { serviceChargeBps: brand.charges.serviceChargeBps, vatBps: brand.charges.vatBps },
    minimumOrderCents: brand.charges.minimumOrderCents,
    alcoholServed: brand.features.alcohol,
    promo,
    now,
  });
}

const promoRow = z.object({
  id: z.uuid(),
  code: z.string(),
  kind: z.enum(["percent", "fixed"]),
  percent_bps: z.number().int().nullable(),
  amount_cents: z.number().int().nullable(),
  min_subtotal_cents: z.number().int(),
  max_discount_cents: z.number().int().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  is_active: z.boolean(),
});

/** Promo codes aren't readable through the public API, so they're looked up with the secret key. */
async function findPromo(code: string): Promise<PromoRecord | null> {
  let raw: unknown;
  if (orderingEnabled()) {
    const { data, error } = await createAdminClient()
      .from("promo_codes")
      .select(
        "id, code, kind, percent_bps, amount_cents, min_subtotal_cents, max_discount_cents, starts_at, ends_at, is_active",
      )
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(`Failed to look up promo code: ${error.message}`);
    raw = data;
  } else {
    raw = seed.promoCodes.find((p) => p.code === code) ?? null;
  }
  if (!raw) return null;
  const row = promoRow.parse(raw);
  return {
    id: row.id,
    code: row.code,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    rule:
      row.kind === "percent"
        ? {
            kind: "percent",
            percentBps: row.percent_bps ?? 0,
            maxDiscountCents: row.max_discount_cents,
            minSubtotalCents: row.min_subtotal_cents,
          }
        : {
            kind: "fixed",
            amountCents: row.amount_cents ?? 0,
            minSubtotalCents: row.min_subtotal_cents,
          },
  };
}

// ---------------------------------------------------------------------------
// Placing orders
// ---------------------------------------------------------------------------

export type PlaceOrderResult =
  | { ok: true; publicToken: string; orderNumber: string }
  | { ok: false; reason: "issues"; issues: QuoteIssue[]; quote: Quote }
  | { ok: false; reason: "promo-exhausted" | "unavailable" | "unknown" };

// No 0/O, 1/I/L, 2/Z, 5/S, 8/B: easy to read out over the phone.
const ORDER_NUMBER_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";

function orderNumber(): string {
  return Array.from(
    { length: 6 },
    () => ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)],
  ).join("");
}

export async function placeOrder(
  request: CheckoutRequest,
  { userId }: { userId: string | null },
): Promise<PlaceOrderResult> {
  if (!orderingEnabled()) return { ok: false, reason: "unavailable" };

  const quote = await getQuote(request);
  if (quote.issues.length > 0) return { ok: false, reason: "issues", issues: quote.issues, quote };

  const payloadBase = {
    branch_id: request.branchId,
    user_id: userId,
    customer_name: request.contact.name,
    customer_phone: request.contact.phone,
    customer_email: request.contact.email,
    type: request.type,
    scheduled_for: request.scheduledFor,
    delivery_district: request.type === "delivery" ? request.address?.district : null,
    delivery_city: request.type === "delivery" ? request.address?.city : null,
    delivery_address: request.type === "delivery" ? request.address?.line : null,
    delivery_landmark: request.type === "delivery" ? request.address?.landmark : null,
    delivery_lat: request.type === "delivery" ? request.location?.lat : null,
    delivery_lng: request.type === "delivery" ? request.location?.lng : null,
    delivery_distance_km: quote.distanceKm,
    notes: request.notes,
    subtotal_cents: quote.totals.subtotalCents,
    discount_cents: quote.totals.discountCents,
    service_charge_cents: quote.totals.serviceChargeCents,
    vat_cents: quote.totals.vatCents,
    delivery_fee_cents: quote.totals.deliveryFeeCents,
    total_cents: quote.totals.totalCents,
    promo_code_id: quote.promo?.id ?? null,
    payment_method: request.paymentMethod,
    idempotency_key: request.idempotencyKey,
    locale: request.locale,
    items: quote.lines.map((line, i) => ({
      menu_item_id: line.menuItemId,
      name_i18n: line.name,
      unit_price_cents: line.unitPriceCents,
      quantity: line.quantity,
      options: line.options,
      spice_level: line.spiceLevel,
      instructions: line.instructions,
      line_total_cents: line.lineTotalCents,
      sort_order: i,
    })),
  };

  const supabase = createAdminClient();
  // The order number is short, so retry on the (rare) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .rpc("place_order", {
        payload: {
          ...payloadBase,
          public_token: randomBytes(24).toString("base64url"),
          order_number: orderNumber(),
        },
      })
      .single<{ order_id: string; public_token: string; order_number: string; created: boolean }>();

    if (!error && data) {
      if (data.created) {
        after(() =>
          sendConfirmation(data.public_token).catch((e) =>
            console.error("[order] email failed", e),
          ),
        );
      }
      return { ok: true, publicToken: data.public_token, orderNumber: data.order_number };
    }
    if (
      error?.message.includes("promo_exhausted") ||
      error?.message.includes("promo_unavailable")
    ) {
      return { ok: false, reason: "promo-exhausted" };
    }
    if (error?.code === "23505" && error.message.includes("order_number")) continue;
    console.error("[order] place_order failed", error?.code, error?.message);
    return { ok: false, reason: "unknown" };
  }
  return { ok: false, reason: "unknown" };
}

// ---------------------------------------------------------------------------
// Reading an order by its tracking token
// ---------------------------------------------------------------------------

const orderRow = z.object({
  id: z.uuid(),
  public_token: z.string(),
  order_number: z.string(),
  branch_id: z.uuid(),
  customer_name: z.string(),
  customer_email: z.string().nullable(),
  type: z.enum(["delivery", "pickup"]),
  status: z.enum([
    "received",
    "accepted",
    "preparing",
    "ready",
    "out_for_delivery",
    "completed",
    "rejected",
    "cancelled",
  ]),
  scheduled_for: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_address: z.string().nullable(),
  delivery_landmark: z.string().nullable(),
  subtotal_cents: z.number().int(),
  discount_cents: z.number().int(),
  service_charge_cents: z.number().int(),
  vat_cents: z.number().int(),
  delivery_fee_cents: z.number().int(),
  total_cents: z.number().int(),
  payment_method: z.enum(["cod", "payhere"]),
  payment_status: z.enum(["pending", "paid", "failed", "refunded"]),
  locale: z.enum(["en", "si", "ta"]),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
  promo_codes: z.object({ code: z.string() }).nullable(),
  branches: z.object({
    name_i18n: z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() }),
    address_line: z.string(),
    city: z.string(),
    phone: z.string(),
  }),
  order_items: z.array(
    z.object({
      name_i18n: z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() }),
      unit_price_cents: z.number().int(),
      quantity: z.number().int(),
      line_total_cents: z.number().int(),
      options: z.array(
        z.object({
          option: z.object({
            en: z.string(),
            si: z.string().optional(),
            ta: z.string().optional(),
          }),
          value: z.object({ en: z.string(), si: z.string().optional(), ta: z.string().optional() }),
          priceDeltaCents: z.number().int(),
        }),
      ),
      spice_level: z.enum(["mild", "medium", "hot"]).nullable(),
      instructions: z.string().nullable(),
      sort_order: z.number().int(),
    }),
  ),
});

export type TrackedOrder = z.infer<typeof orderRow>;

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/** The order behind a tracking link, or null. Server only: uses the secret key. */
export async function getOrderByToken(token: string): Promise<TrackedOrder | null> {
  if (!TOKEN.test(token) || !orderingEnabled()) return null;
  const { data, error } = await createAdminClient()
    .from("orders")
    .select(
      `id, public_token, order_number, branch_id, customer_name, customer_email, type, status, scheduled_for,
       delivery_city, delivery_address, delivery_landmark, subtotal_cents, discount_cents, service_charge_cents,
       vat_cents, delivery_fee_cents, total_cents, payment_method, payment_status, locale, rejection_reason, created_at,
       promo_codes (code),
       branches (name_i18n, address_line, city, phone),
       order_items (name_i18n, unit_price_cents, quantity, line_total_cents, options, spice_level, instructions, sort_order)`,
    )
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  if (!data) return null;
  const order = orderRow.parse(data);
  order.order_items.sort((a, b) => a.sort_order - b.sort_order);
  return order;
}

// ---------------------------------------------------------------------------
// Confirmation email
// ---------------------------------------------------------------------------

export function trackingPath(token: string, locale: Locale): string {
  return `${locale === "en" ? "" : `/${locale}`}/track/${token}`;
}

async function sendConfirmation(token: string): Promise<void> {
  const order = await getOrderByToken(token);
  if (!order?.customer_email) return;

  const locale = order.locale;
  const [brand, messages] = await Promise.all([getBrand(), loadMessages(locale)]);
  const t = createTranslator({ locale, messages, namespace: "Email" });
  const tc = createTranslator({ locale, messages, namespace: "Checkout" });
  const spice = createTranslator({ locale, messages, namespace: "Spice" });
  const branchName = localize(order.branches.name_i18n, locale);
  const when = order.scheduled_for
    ? new Intl.DateTimeFormat(`${locale}-LK`, {
        timeZone: "Asia/Colombo",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(order.scheduled_for))
    : t("asap");
  const where =
    order.type === "delivery"
      ? [order.delivery_address, order.delivery_landmark, order.delivery_city]
          .filter(Boolean)
          .join(", ")
      : `${branchName}, ${order.branches.address_line}, ${order.branches.city}`;

  const totals = [
    { label: tc("subtotal"), value: formatLKR(order.subtotal_cents) },
    ...(order.discount_cents > 0
      ? [
          {
            label: tc("discount", { code: order.promo_codes?.code ?? "" }),
            value: formatLKR(-order.discount_cents),
          },
        ]
      : []),
    {
      label: tc("serviceCharge", { percent: brand.charges.serviceChargeBps / 100 }),
      value: formatLKR(order.service_charge_cents),
    },
    {
      label: tc("vat", { percent: brand.charges.vatBps / 100 }),
      value: formatLKR(order.vat_cents),
    },
    ...(order.type === "delivery"
      ? [
          {
            label: tc("deliveryFee"),
            value:
              order.delivery_fee_cents === 0 ? tc("free") : formatLKR(order.delivery_fee_cents),
          },
        ]
      : []),
    { label: tc("total"), value: formatLKR(order.total_cents), strong: true },
  ];

  const footer = [
    t("footer", { brand: brand.name, phone: formatPhone(order.branches.phone) }),
    publicEnv.demoMode ? t("demoFooter") : null,
  ]
    .filter(Boolean)
    .join(" ");

  await sendEmail({
    to: order.customer_email,
    subject: t("subject", { number: order.order_number, brand: brand.name }),
    react: OrderConfirmationEmail({
      brand,
      lang: locale,
      trackingUrl: `${publicEnv.siteUrl}${trackingPath(order.public_token, locale)}`,
      lines: order.order_items.map((item) => ({
        quantity: item.quantity,
        name: localize(item.name_i18n, locale),
        details: [
          ...item.options.map((o) => localize(o.value, locale)),
          item.spice_level ? spice(item.spice_level) : null,
          item.instructions ? `“${item.instructions}”` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        totalLabel: formatLKR(item.line_total_cents),
      })),
      text: {
        preview: t("preview", { number: order.order_number }),
        heading: t("heading", { name: order.customer_name }),
        intro: t("intro", { branch: branchName }),
        orderNumberLabel: t("orderNumber"),
        orderNumber: order.order_number,
        whenLabel: t("when"),
        when,
        whereLabel: order.type === "delivery" ? t("deliverTo") : t("pickupFrom"),
        where,
        itemsLabel: t("items"),
        totals,
        payment:
          order.type === "delivery"
            ? t("cod", { amount: formatLKR(order.total_cents) })
            : t("codPickup", { amount: formatLKR(order.total_cents) }),
        track: t("track"),
        footer,
      },
    }),
  });
}
