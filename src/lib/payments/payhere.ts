import { createHash, timingSafeEqual } from "node:crypto";

import { assertCents } from "@/lib/money";

/**
 * PayHere Checkout API helpers (https://support.payhere.lk/api-&-mobile-sdk/checkout-api).
 * Pure functions: the merchant secret is passed in by server code and never
 * leaves the server. Only the resulting hash is sent to the browser.
 */

export const PAYHERE_ORIGIN = {
  sandbox: "https://sandbox.payhere.lk",
  // Live checkout must include "www" (PayHere error PH-0022 otherwise).
  live: "https://www.payhere.lk",
} as const;

export function payhereOrigin(sandbox: boolean): string {
  return sandbox ? PAYHERE_ORIGIN.sandbox : PAYHERE_ORIGIN.live;
}

/** What the browser posts to PayHere: the checkout URL and the signed form fields. */
export type PaymentForm = { action: string; fields: Record<string, string> };

export function payhereCheckoutUrl(sandbox: boolean): string {
  return `${payhereOrigin(sandbox)}/pay/checkout`;
}

/** PayHere's amount format: two decimals, no thousands separator. `123450` → `"1234.50"`. */
export function formatPayHereAmount(cents: number): string {
  assertCents(cents);
  if (cents < 0) throw new RangeError("A payment amount can't be negative");
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** `"1234.50"` → `123450`. Anything not in PayHere's format → null. */
export function parsePayHereAmount(value: string): number | null {
  const match = /^(\d{1,9})\.(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 100 + Number(match[2]);
}

// MD5 is what PayHere's protocol specifies for both the checkout hash and the
// notification signature; a stronger hash would simply be rejected. It is used
// as a keyed checksum over the request, never to store the secret, and
// signatures are compared in constant time. (CodeQL's weak-algorithm alert on
// this line is expected.)
const md5Upper = (value: string) =>
  createHash("md5").update(value, "utf8").digest("hex").toUpperCase();

/** The `hash` field of a checkout request. */
export function checkoutHash(
  request: { merchantId: string; orderId: string; amountCents: number; currency: string },
  merchantSecret: string,
): string {
  return md5Upper(
    request.merchantId +
      request.orderId +
      formatPayHereAmount(request.amountCents) +
      request.currency +
      md5Upper(merchantSecret),
  );
}

export type PayHereNotificationFields = {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
};

/** The `md5sig` PayHere sends with a notification, computed from the fields as received. */
export function notificationSignature(
  fields: Omit<PayHereNotificationFields, "md5sig">,
  merchantSecret: string,
): string {
  return md5Upper(
    fields.merchant_id +
      fields.order_id +
      fields.payhere_amount +
      fields.payhere_currency +
      fields.status_code +
      md5Upper(merchantSecret),
  );
}

/** Constant-time check of a notification's `md5sig`. */
export function verifyNotificationSignature(
  fields: PayHereNotificationFields,
  merchantSecret: string,
): boolean {
  const expected = Buffer.from(notificationSignature(fields, merchantSecret));
  const received = Buffer.from(fields.md5sig.toUpperCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** PayHere wants a first and a last name; a single name is sent as both. */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1)! };
}

/** `+94771234567` → `0771234567`, the form PayHere's phone field expects. */
export function localPhone(e164: string): string {
  return e164.startsWith("+94") ? `0${e164.slice(3)}` : e164;
}

/** PayHere rejects emoji, markup and script-like content in its fields. */
export function payhereText(value: string, max = 100): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
