import { applyBasisPoints, assertCents } from "@/lib/money";

/**
 * Order totals (docs/DECISIONS.md B1):
 *
 *   subtotal          sum of line totals
 *   − discount        promo code, never more than the subtotal
 *   − loyalty         points spent (B2), at most a share of what's left
 *   + service charge  on (subtotal − discounts)
 *   + VAT             on (subtotal − discounts + service charge)
 *   + delivery fee    no VAT
 *
 * All amounts are integer cents; each computed amount rounds half up.
 * Pure: the browser shows these numbers, the server recomputes them before
 * saving an order.
 */

export type Charges = { serviceChargeBps: number; vatBps: number };

export type PromoRule =
  | {
      kind: "percent";
      percentBps: number;
      maxDiscountCents: number | null;
      minSubtotalCents: number;
    }
  | { kind: "fixed"; amountCents: number; minSubtotalCents: number };

export type DeliveryFeeRules = {
  baseFeeCents: number;
  includedKm: number;
  perKmCents: number;
  freeAboveCents: number | null;
};

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  /** Points spent and what they took off. 0 when none. */
  loyaltyPoints: number;
  loyaltyDiscountCents: number;
  serviceChargeCents: number;
  vatCents: number;
  deliveryFeeCents: number;
  totalCents: number;
};

/** Discount for a subtotal, or 0 when the minimum spend isn't met. */
export function promoDiscountCents(promo: PromoRule, subtotalCents: number): number {
  assertCents(subtotalCents);
  if (subtotalCents < promo.minSubtotalCents) return 0;
  const raw =
    promo.kind === "percent"
      ? applyBasisPoints(subtotalCents, promo.percentBps)
      : promo.amountCents;
  const capped =
    promo.kind === "percent" && promo.maxDiscountCents !== null
      ? Math.min(raw, promo.maxDiscountCents)
      : raw;
  return Math.min(capped, subtotalCents);
}

/**
 * Base fee for the first `includedKm`, then `perKmCents` for each started
 * kilometre beyond. Free once the food total (after discount) reaches
 * `freeAboveCents`.
 */
export function deliveryFeeCents(
  rules: DeliveryFeeRules,
  distanceKm: number,
  foodTotalCents: number,
): number {
  assertCents(foodTotalCents);
  if (rules.freeAboveCents !== null && foodTotalCents >= rules.freeAboveCents) return 0;
  const extraKm = Math.max(0, Math.ceil(distanceKm - rules.includedKm - 1e-9));
  return rules.baseFeeCents + extraKm * rules.perKmCents;
}

export type LoyaltyRedemption = {
  /** Points the customer wants to spend (at most their balance). */
  points: number;
  pointValueCents: number;
  /** The most the points may take off the food total after the promo, in basis points. */
  maxShareBps: number;
};

/** Points actually spent and their value: whole points, within the cap. */
export function loyaltyDiscount(
  redemption: LoyaltyRedemption,
  afterPromoCents: number,
): { points: number; cents: number } {
  assertCents(afterPromoCents);
  if (redemption.points <= 0 || redemption.pointValueCents <= 0) return { points: 0, cents: 0 };
  const cap = applyBasisPoints(afterPromoCents, redemption.maxShareBps);
  const points = Math.min(redemption.points, Math.floor(cap / redemption.pointValueCents));
  return { points, cents: points * redemption.pointValueCents };
}

export function priceOrder({
  lineTotalsCents,
  charges,
  promo,
  delivery,
  loyalty = null,
}: {
  lineTotalsCents: number[];
  charges: Charges;
  promo: PromoRule | null;
  /** Null for pickup. */
  delivery: { rules: DeliveryFeeRules; distanceKm: number } | null;
  loyalty?: LoyaltyRedemption | null;
}): OrderTotals {
  lineTotalsCents.forEach(assertCents);
  const subtotalCents = lineTotalsCents.reduce((sum, n) => sum + n, 0);
  const discountCents = promo ? promoDiscountCents(promo, subtotalCents) : 0;
  const spent = loyalty
    ? loyaltyDiscount(loyalty, subtotalCents - discountCents)
    : { points: 0, cents: 0 };
  const afterDiscount = subtotalCents - discountCents - spent.cents;
  const serviceChargeCents = applyBasisPoints(afterDiscount, charges.serviceChargeBps);
  const vatCents = applyBasisPoints(afterDiscount + serviceChargeCents, charges.vatBps);
  const fee = delivery ? deliveryFeeCents(delivery.rules, delivery.distanceKm, afterDiscount) : 0;
  return {
    subtotalCents,
    discountCents,
    loyaltyPoints: spent.points,
    loyaltyDiscountCents: spent.cents,
    serviceChargeCents,
    vatCents,
    deliveryFeeCents: fee,
    totalCents: afterDiscount + serviceChargeCents + vatCents + fee,
  };
}
