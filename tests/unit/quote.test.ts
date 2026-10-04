import { beforeAll, describe, expect, it } from "vitest";

import { defaultBrand } from "@/config/brand";
import * as seed from "@/data/seed";
import { getPublicRows, type PublicRows } from "@/lib/data/source";
import { quoteOrder, type PromoRecord, type QuoteContext } from "@/lib/orders/quote";
import type { QuoteRequest } from "@/lib/orders/schema";

const id = (kind: string, key: string) => seed.stableId(kind, key);
const branch = (slug: string) => id("branch", slug);
const item = (slug: string) => id("menu-item", slug);
const option = (itemSlug: string, key: string) => id("item-option", `${itemSlug}/${key}`);
const value = (itemSlug: string, optionKey: string, key: string) =>
  id("item-option-value", `${itemSlug}/${optionKey}/${key}`);

/** Monday 5 October 2026, 13:00 in Colombo. Every branch is open. */
const LUNCHTIME = new Date("2026-10-05T13:00:00+05:30");
/** Near Colombo 07 (about 1 km away). */
const NEAR_COLOMBO_07 = { lat: 6.905, lng: 79.862 };
const KANDY_TOWN = { lat: 7.2906, lng: 80.6337 };

let rows: PublicRows;
beforeAll(async () => {
  rows = await getPublicRows(); // Supabase isn't configured in tests: the seed data
});

function context(overrides: Partial<QuoteContext> = {}): QuoteContext {
  return {
    rows,
    charges: { serviceChargeBps: 1000, vatBps: 1800 },
    minimumOrderCents: defaultBrand.charges.minimumOrderCents,
    alcoholServed: true,
    promo: null,
    now: LUNCHTIME,
    ...overrides,
  };
}

function request(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
  return {
    branchId: branch("colombo-07"),
    type: "delivery",
    lines: [
      {
        menuItemId: item("chicken-kottu"),
        selection: {
          [option("chicken-kottu", "portion")]: [value("chicken-kottu", "portion", "large")],
          [option("chicken-kottu", "add-ons")]: [value("chicken-kottu", "add-ons", "extra-cheese")],
        },
        spiceLevel: "hot",
        instructions: "Extra gravy please",
        quantity: 2,
      },
    ],
    promoCode: null,
    location: NEAR_COLOMBO_07,
    scheduledFor: null,
    ...overrides,
  };
}

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("quoteOrder", () => {
  it("prices a valid delivery order from the database rows", () => {
    const quote = quoteOrder(request(), context());
    expect(quote.issues).toEqual([]);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0]).toMatchObject({
      unitPriceCents: 1650_00 + 450_00 + 350_00,
      quantity: 2,
      lineTotalCents: 2450_00 * 2,
      spiceLevel: "hot",
      instructions: "Extra gravy please",
    });
    expect(quote.lines[0]!.options.map((o) => o.value.en)).toEqual(["Large", "Extra cheese"]);
    expect(quote.distanceKm).toBeLessThan(3);
    expect(quote.totals).toEqual({
      subtotalCents: 4900_00,
      discountCents: 0,
      serviceChargeCents: 490_00,
      vatCents: 970_20, // 18% of 5,390.00
      deliveryFeeCents: 250_00,
      totalCents: 4900_00 + 490_00 + 970_20 + 250_00,
    });
  });

  it("uses the branch's own price", () => {
    const quote = quoteOrder(
      request({
        branchId: branch("nugegoda"),
        type: "pickup",
        location: null,
        lines: [
          {
            menuItemId: item("chicken-kottu"),
            selection: {},
            spiceLevel: null,
            instructions: null,
            quantity: 1,
          },
        ],
      }),
      context(),
    );
    expect(quote.issues).toEqual([]);
    expect(quote.lines[0]!.unitPriceCents).toBe(1550_00);
    expect(quote.lines[0]!.spiceLevel).toBe("medium"); // default for spice-selectable dishes
  });

  it("rejects items sold out at the branch", () => {
    const quote = quoteOrder(
      request({
        branchId: branch("nugegoda"),
        type: "pickup",
        location: null,
        lines: [
          {
            menuItemId: item("dolphin-kottu"),
            selection: {},
            spiceLevel: null,
            instructions: null,
            quantity: 1,
          },
        ],
      }),
      context(),
    );
    expect(quote.issues).toEqual([{ code: "item-unavailable", lineIndex: 0 }]);
    expect(quote.lines).toEqual([]);
  });

  it("doesn't sell alcohol on a Poya day", () => {
    const vapPoya = new Date("2026-10-25T13:00:00+05:30");
    const quote = quoteOrder(
      request({
        type: "pickup",
        location: null,
        lines: [
          {
            menuItemId: item("island-lager"),
            selection: {},
            spiceLevel: null,
            instructions: null,
            quantity: 2,
          },
        ],
      }),
      context({ now: vapPoya }),
    );
    expect(quote.issues).toEqual([{ code: "item-not-today", lineIndex: 0 }]);
  });

  it("rejects options that don't belong to the item, and spice on a dish without it", () => {
    const foreign = quoteOrder(
      request({
        lines: [
          {
            menuItemId: item("chicken-kottu"),
            selection: {
              [option("chicken-kottu", "portion")]: [value("lamprais", "portion", "large")],
            },
            spiceLevel: null,
            instructions: null,
            quantity: 1,
          },
        ],
      }),
      context(),
    );
    expect(codes(foreign.issues)).toContain("options-invalid");

    const spice = quoteOrder(
      request({
        type: "pickup",
        location: null,
        lines: [
          {
            menuItemId: item("wattalappan"),
            selection: {},
            spiceLevel: "hot",
            instructions: null,
            quantity: 1,
          },
        ],
      }),
      context(),
    );
    expect(codes(spice.issues)).toEqual(["options-invalid"]);
  });

  it("refuses deliveries outside the branch's radius", () => {
    const quote = quoteOrder(request({ location: KANDY_TOWN }), context());
    expect(quote.issues).toEqual([
      expect.objectContaining({ code: "outside-delivery-area", radiusKm: 6 }),
    ]);
  });

  it("needs a location for delivery", () => {
    expect(codes(quoteOrder(request({ location: null }), context()).issues)).toEqual([
      "location-required",
    ]);
  });

  it("asks to schedule when the branch is closed", () => {
    const early = new Date("2026-10-05T08:00:00+05:30");
    const quote = quoteOrder(request(), context({ now: early }));
    expect(quote.issues).toEqual([
      { code: "branch-closed", opensAt: { day: "mon", time: "11:00" } },
    ]);
  });

  it("accepts a scheduled time inside opening hours and rejects others", () => {
    const early = new Date("2026-10-05T08:00:00+05:30");
    const at = (iso: string) =>
      quoteOrder(request({ scheduledFor: iso }), context({ now: early })).issues;
    expect(at("2026-10-05T12:30:00+05:30")).toEqual([]);
    expect(codes(at("2026-10-05T23:30:00+05:30"))).toEqual(["schedule-invalid"]); // after closing
    expect(codes(at("2026-10-05T08:10:00+05:30"))).toEqual(["schedule-invalid"]); // too soon
    expect(codes(at("2026-10-12T12:30:00+05:30"))).toEqual(["schedule-invalid"]); // too far ahead
  });

  it("enforces the delivery minimum but not for pickup", () => {
    const small = {
      lines: [
        {
          menuItemId: item("fish-bun"),
          selection: {},
          spiceLevel: null,
          instructions: null,
          quantity: 1,
        },
      ],
    };
    expect(codes(quoteOrder(request(small), context()).issues)).toEqual(["below-minimum"]);
    expect(
      quoteOrder(request({ ...small, type: "pickup", location: null }), context()).issues,
    ).toEqual([]);
  });

  it("refuses orders to a branch that has paused online orders", () => {
    const paused = {
      ...rows,
      branches: rows.branches.map((b) => ({ ...b, is_accepting_orders: false })),
    };
    expect(codes(quoteOrder(request(), context({ rows: paused })).issues)).toContain(
      "branch-unavailable",
    );
  });
});

describe("quoteOrder with promo codes", () => {
  const welcome: PromoRecord = {
    id: id("promo-code", "WELCOME10"),
    code: "WELCOME10",
    rule: {
      kind: "percent",
      percentBps: 1000,
      maxDiscountCents: 1000_00,
      minSubtotalCents: 2000_00,
    },
    startsAt: null,
    endsAt: null,
    isActive: true,
  };

  it("applies a valid code", () => {
    const quote = quoteOrder(request({ promoCode: "WELCOME10" }), context({ promo: welcome }));
    expect(quote.issues).toEqual([]);
    expect(quote.promo).toEqual({ id: welcome.id, code: "WELCOME10" });
    expect(quote.totals.discountCents).toBe(490_00);
  });

  it("reports unknown, expired and below-minimum codes without applying them", () => {
    expect(codes(quoteOrder(request({ promoCode: "NOPE" }), context()).issues)).toEqual([
      "promo-invalid",
    ]);

    const expired = { ...welcome, endsAt: "2026-04-20T00:00:00+05:30" };
    expect(
      codes(quoteOrder(request({ promoCode: "WELCOME10" }), context({ promo: expired })).issues),
    ).toEqual(["promo-expired"]);

    const smallOrder = request({
      promoCode: "WELCOME10",
      type: "pickup",
      location: null,
      lines: [
        {
          menuItemId: item("fish-bun"),
          selection: {},
          spiceLevel: null,
          instructions: null,
          quantity: 2,
        },
      ],
    });
    const quote = quoteOrder(smallOrder, context({ promo: welcome }));
    expect(codes(quote.issues)).toEqual(["promo-min-spend"]);
    expect(quote.totals.discountCents).toBe(0);
    expect(quote.promo).toBeNull();
  });
});
