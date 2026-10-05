import { describe, expect, it } from "vitest";

import {
  deliveryFeeCents,
  priceOrder,
  promoDiscountCents,
  type DeliveryFeeRules,
  type PromoRule,
} from "@/lib/pricing/order";

const charges = { serviceChargeBps: 1000, vatBps: 1800 };
const applyVat = (cents: number) => Math.round((cents * 1800) / 10_000);
const colombo: DeliveryFeeRules = {
  baseFeeCents: 250_00,
  includedKm: 3,
  perKmCents: 60_00,
  freeAboveCents: 7500_00,
};
const welcome10: PromoRule = {
  kind: "percent",
  percentBps: 1000,
  maxDiscountCents: 1000_00,
  minSubtotalCents: 2000_00,
};
const kottu200: PromoRule = { kind: "fixed", amountCents: 200_00, minSubtotalCents: 1500_00 };

describe("priceOrder", () => {
  it("matches the worked example: service charge, VAT on top, then delivery", () => {
    expect(
      priceOrder({
        lineTotalsCents: [1650_00, 720_00],
        charges,
        promo: null,
        delivery: { rules: colombo, distanceKm: 2.4 },
      }),
    ).toEqual({
      subtotalCents: 2370_00,
      discountCents: 0,
      loyaltyPoints: 0,
      loyaltyDiscountCents: 0,
      serviceChargeCents: 237_00,
      vatCents: 469_26, // 18% of 2,607.00
      deliveryFeeCents: 250_00,
      totalCents: 3326_26,
    });
  });

  it("applies the discount before service charge and VAT", () => {
    const totals = priceOrder({
      lineTotalsCents: [3000_00],
      charges,
      promo: welcome10,
      delivery: null,
    });
    expect(totals.discountCents).toBe(300_00);
    expect(totals.serviceChargeCents).toBe(270_00); // 10% of 2,700
    expect(totals.vatCents).toBe(534_60); // 18% of 2,970
    expect(totals.totalCents).toBe(2700_00 + 270_00 + 534_60);
  });

  it("takes loyalty points off after the promo, capped at a share of the food total", () => {
    const loyalty = { pointValueCents: 1_00, maxShareBps: 2000 };
    const few = priceOrder({
      lineTotalsCents: [3000_00],
      charges,
      promo: welcome10,
      delivery: null,
      loyalty: { ...loyalty, points: 150 },
    });
    expect(few).toMatchObject({
      discountCents: 300_00,
      loyaltyPoints: 150,
      loyaltyDiscountCents: 150_00,
    });
    expect(few.serviceChargeCents).toBe(255_00); // 10% of 2,550
    expect(few.totalCents).toBe(2550_00 + 255_00 + applyVat(2550_00 + 255_00));

    const many = priceOrder({
      lineTotalsCents: [3000_00],
      charges,
      promo: welcome10,
      delivery: null,
      loyalty: { ...loyalty, points: 5000 },
    });
    expect(many).toMatchObject({ loyaltyPoints: 540, loyaltyDiscountCents: 540_00 }); // 20% of 2,700
  });

  it("totals always add up", () => {
    for (const lines of [[1], [99, 101], [123_45, 67_89, 1_00], [7500_00]]) {
      const t = priceOrder({
        lineTotalsCents: lines,
        charges,
        promo: kottu200,
        delivery: { rules: colombo, distanceKm: 5.5 },
      });
      expect(t.totalCents).toBe(
        t.subtotalCents -
          t.discountCents -
          t.loyaltyDiscountCents +
          t.serviceChargeCents +
          t.vatCents +
          t.deliveryFeeCents,
      );
    }
  });

  it("rejects fractional money", () => {
    expect(() =>
      priceOrder({ lineTotalsCents: [10.5], charges, promo: null, delivery: null }),
    ).toThrow(TypeError);
  });
});

describe("promoDiscountCents", () => {
  it("needs the minimum spend", () => {
    expect(promoDiscountCents(welcome10, 1999_99)).toBe(0);
    expect(promoDiscountCents(welcome10, 2000_00)).toBe(200_00);
  });

  it("caps percentage discounts", () => {
    expect(promoDiscountCents(welcome10, 50000_00)).toBe(1000_00);
  });

  it("never discounts more than the subtotal", () => {
    expect(
      promoDiscountCents({ kind: "fixed", amountCents: 500_00, minSubtotalCents: 0 }, 300_00),
    ).toBe(300_00);
  });
});

describe("deliveryFeeCents", () => {
  it("charges the base fee within the included distance", () => {
    expect(deliveryFeeCents(colombo, 0.5, 2000_00)).toBe(250_00);
    expect(deliveryFeeCents(colombo, 3, 2000_00)).toBe(250_00);
  });

  it("adds a fee for each started kilometre beyond it", () => {
    expect(deliveryFeeCents(colombo, 3.1, 2000_00)).toBe(310_00);
    expect(deliveryFeeCents(colombo, 5.5, 2000_00)).toBe(250_00 + 3 * 60_00);
  });

  it("is free above the threshold", () => {
    expect(deliveryFeeCents(colombo, 5.5, 7500_00)).toBe(0);
    expect(deliveryFeeCents({ ...colombo, freeAboveCents: null }, 1, 99999_00)).toBe(250_00);
  });
});
