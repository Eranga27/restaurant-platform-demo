import { describe, expect, it } from "vitest";

import {
  defaultSelection,
  fromPriceCents,
  unitPriceCents,
  validateSelection,
  type PricedItem,
} from "@/lib/pricing/item";

const kottu: PricedItem = {
  basePriceCents: 165_000,
  options: [
    {
      id: "portion",
      selection: "single",
      isRequired: true,
      maxSelect: null,
      values: [
        { id: "regular", priceDeltaCents: 0, isDefault: true },
        { id: "large", priceDeltaCents: 45_000, isDefault: false },
      ],
    },
    {
      id: "add-ons",
      selection: "multiple",
      isRequired: false,
      maxSelect: 2,
      values: [
        { id: "cheese", priceDeltaCents: 35_000, isDefault: false },
        { id: "egg", priceDeltaCents: 15_000, isDefault: false },
        { id: "gravy", priceDeltaCents: 0, isDefault: false },
      ],
    },
  ],
};

const feast: PricedItem = {
  basePriceCents: 265_000,
  options: [
    {
      id: "curry",
      selection: "single",
      isRequired: true,
      maxSelect: null,
      values: [
        { id: "chicken", priceDeltaCents: 0, isDefault: false },
        { id: "vegetable", priceDeltaCents: -30_000, isDefault: false },
      ],
    },
  ],
};

describe("defaultSelection", () => {
  it("picks marked defaults, and the first value of a required single choice", () => {
    expect(defaultSelection(kottu)).toEqual({ portion: ["regular"], "add-ons": [] });
    expect(defaultSelection(feast)).toEqual({ curry: ["chicken"] });
  });
});

describe("validateSelection", () => {
  it("accepts the default selection", () => {
    expect(validateSelection(kottu, defaultSelection(kottu))).toEqual([]);
  });

  it("flags a missing required choice", () => {
    expect(validateSelection(kottu, { portion: [], "add-ons": [] })).toEqual([
      { optionId: "portion", kind: "required" },
    ]);
  });

  it("flags too many choices", () => {
    expect(
      validateSelection(kottu, {
        portion: ["regular", "large"],
        "add-ons": ["cheese", "egg", "gravy"],
      }),
    ).toEqual([
      { optionId: "portion", kind: "too-many", max: 1 },
      { optionId: "add-ons", kind: "too-many", max: 2 },
    ]);
  });

  it("flags values and options that don't belong to the item", () => {
    expect(validateSelection(kottu, { portion: ["huge"], "add-ons": [] })).toContainEqual({
      optionId: "portion",
      kind: "unknown-value",
    });
    expect(validateSelection(kottu, { portion: ["regular"], sneaky: ["x"] })).toContainEqual({
      optionId: "sneaky",
      kind: "unknown-value",
    });
  });
});

describe("unitPriceCents", () => {
  it("adds option deltas to the base price", () => {
    expect(unitPriceCents(kottu, { portion: ["large"], "add-ons": ["cheese", "gravy"] })).toBe(
      245_000,
    );
  });

  it("starts from the branch price when there is one", () => {
    expect(unitPriceCents(kottu, { portion: ["regular"] }, 155_000)).toBe(155_000);
  });

  it("applies negative deltas but never goes below zero", () => {
    expect(unitPriceCents(feast, { curry: ["vegetable"] })).toBe(235_000);
    expect(
      unitPriceCents({ basePriceCents: 100, options: feast.options }, { curry: ["vegetable"] }),
    ).toBe(0);
  });
});

describe("fromPriceCents", () => {
  it("is the cheapest price with every required choice made", () => {
    expect(fromPriceCents(kottu)).toBe(165_000);
    expect(fromPriceCents(feast)).toBe(235_000);
  });
});
