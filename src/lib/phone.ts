/**
 * Sri Lankan phone numbers. Stored as E.164 (+94XXXXXXXXX); accepted in the
 * forms people actually type: 077 123 4567, 0771234567, +94 77 123 4567,
 * 94771234567.
 */

const E164 = /^\+94[0-9]{9}$/;

/** Returns the E.164 form, or null if this isn't a valid Sri Lankan number. */
export function normalizeSriLankanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  let national: string | undefined;
  if (/^\+94[0-9]{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0094[0-9]{9}$/.test(digits)) national = digits.slice(4);
  else if (/^94[0-9]{9}$/.test(digits)) national = digits.slice(2);
  else if (/^0[0-9]{9}$/.test(digits)) national = digits.slice(1);
  if (!national || national.startsWith("0")) return null;
  return `+94${national}`;
}

/** True for mobile numbers (07X), which can receive SMS and WhatsApp. */
export function isSriLankanMobile(e164: string): boolean {
  return /^\+947[0-9]{8}$/.test(e164);
}

/** `+94770000700` → `+94 77 000 0700`. Returns the input unchanged if it isn't E.164. */
export function formatPhone(e164: string): string {
  if (!E164.test(e164)) return e164;
  const n = e164.slice(3);
  return `+94 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

/** `+94770000700` → `94770000700`, the form wa.me links expect. */
export function whatsappNumber(e164: string): string {
  return e164.replace(/^\+/, "");
}
