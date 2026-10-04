/**
 * Money is always an integer number of cents (LKR × 100). Convert to a decimal
 * only at the edge, for display or for a payment gateway payload.
 */

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `125000` → `"Rs. 1,250.00"`. Negative amounts (discounts) → `"-Rs. 100.00"`. */
export function formatLKR(cents: number): string {
  assertCents(cents);
  const sign = cents < 0 ? "-" : "";
  return `${sign}Rs. ${numberFormat.format(Math.abs(cents) / 100)}`;
}

/** Applies a basis-point rate (1000 = 10%), rounding half up to the nearest cent. */
export function applyBasisPoints(cents: number, bps: number): number {
  assertCents(cents);
  if (!Number.isInteger(bps)) throw new TypeError(`Basis points must be an integer, got ${bps}`);
  return Math.round((cents * bps) / 10_000);
}

export function assertCents(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`Money must be an integer number of cents, got ${value}`);
  }
}
