/**
 * Money is always an integer number of cents (LKR × 100). Convert to a decimal
 * only at the edge, for display or for a payment gateway payload.
 */

const numberFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * `125000` → `"Rs. 1,250.00"`. Negative amounts (discounts) → `"-Rs. 100.00"`.
 * With `whole`, for prices shown on the menu and in marketing copy, whole
 * rupees drop the cents: `"Rs. 1,250"`. Amounts with cents keep them.
 */
export function formatLKR(cents: number, { whole = false }: { whole?: boolean } = {}): string {
  assertCents(cents);
  const sign = cents < 0 ? "-" : "";
  const amount = Math.abs(cents);
  const format = whole && amount % 100 === 0 ? wholeFormat : numberFormat;
  return `${sign}Rs. ${format.format(amount / 100)}`;
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
