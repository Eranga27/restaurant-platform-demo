import { beforeEach, describe, expect, it, vi } from "vitest";

import * as seed from "@/data/seed";
import { buildReorder } from "@/lib/account/reorder";
import type * as PublicClient from "@/lib/supabase/public";

// The customer's order comes from their session (RLS); the menu from the seed data.
let order: unknown = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: order, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/supabase/public", async (importOriginal) => ({
  ...(await importOriginal<typeof PublicClient>()),
  createPublicClient: () => null,
}));

const ORDER_ID = "00000000-0000-4000-8000-00000000a001";
const nugegoda = seed.stableId("branch", "nugegoda");
const item = (slug: string) => seed.stableId("menu-item", slug);
const option = (slug: string, key: string) => seed.stableId("item-option", `${slug}/${key}`);
const value = (slug: string, key: string, valueKey: string) =>
  seed.stableId("item-option-value", `${slug}/${key}/${valueKey}`);

const kottuLine = (overrides: Record<string, unknown> = {}) => ({
  menu_item_id: item("chicken-kottu"),
  quantity: 2,
  spice_level: "hot",
  instructions: "No leeks",
  options: [
    {
      optionId: option("chicken-kottu", "portion"),
      valueId: value("chicken-kottu", "portion", "large"),
      option: { en: "Portion" },
      value: { en: "Large" },
    },
    {
      optionId: option("chicken-kottu", "add-ons"),
      valueId: value("chicken-kottu", "add-ons", "extra-cheese"),
      option: { en: "Add-ons" },
      value: { en: "Extra cheese" },
    },
  ],
  ...overrides,
});

beforeEach(() => {
  order = { branch_id: nugegoda, type: "delivery", order_items: [kottuLine()] };
});

describe("buildReorder()", () => {
  it("rebuilds the cart with today's prices and the same choices", async () => {
    const result = await buildReorder(ORDER_ID, "en");
    expect(result).toMatchObject({ ok: true, branchId: nugegoda, type: "delivery", skipped: 0 });
    if (!result.ok) return;
    expect(result.lines).toEqual([
      expect.objectContaining({
        menuItemId: item("chicken-kottu"),
        name: "Chicken kottu",
        selection: {
          [option("chicken-kottu", "portion")]: [value("chicken-kottu", "portion", "large")],
          [option("chicken-kottu", "add-ons")]: [value("chicken-kottu", "add-ons", "extra-cheese")],
        },
        details: ["Large", "Extra cheese"],
        spiceLevel: "hot",
        instructions: "No leeks",
        quantity: 2,
        // Nugegoda's kottu price (Rs 1,550) + large (Rs 450) + cheese (Rs 350).
        unitPriceCents: 2350_00,
      }),
    ]);
  });

  it("matches choices by name for orders saved before choice IDs were", async () => {
    order = {
      branch_id: nugegoda,
      type: "pickup",
      order_items: [
        kottuLine({
          options: [{ option: { en: "Portion" }, value: { en: "Large" } }],
        }),
      ],
    };
    const result = await buildReorder(ORDER_ID, "si");
    if (!result.ok) throw new Error("expected a cart");
    expect(result.lines[0]).toMatchObject({
      name: "චිකන් කොත්තු",
      details: ["විශාල"],
      unitPriceCents: 2000_00,
    });
  });

  it("leaves out dishes that are gone or sold out, and choices that no longer exist", async () => {
    order = {
      branch_id: nugegoda,
      type: "pickup",
      order_items: [
        kottuLine({
          quantity: 50,
          options: [{ option: { en: "Sauce" }, value: { en: "Old sauce" } }],
        }),
        kottuLine({ menu_item_id: null }),
        kottuLine({ menu_item_id: item("dolphin-kottu"), options: [] }),
      ],
    };
    const result = await buildReorder(ORDER_ID, "en");
    if (!result.ok) throw new Error("expected a cart");
    expect(result.skipped).toBe(2);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      selection: {},
      unitPriceCents: 1550_00,
      quantity: 20,
    });
  });

  it("refuses an order the customer can't see", async () => {
    order = null;
    expect(await buildReorder(ORDER_ID, "en")).toEqual({ ok: false });
    expect(await buildReorder("not-an-id", "en")).toEqual({ ok: false });
  });
});
