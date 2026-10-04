import { describe, expect, it } from "vitest";

import { brandSchema, defaultBrand } from "@/config/brand";

import { contrast } from "./helpers/contrast";

describe("default brand", () => {
  it("passes its own schema", () => {
    expect(brandSchema.safeParse(defaultBrand).success).toBe(true);
  });

  // Guards rebrands too: a new palette that fails AA breaks the build.
  const { colors } = defaultBrand;
  it.each([
    ["foreground on background", colors.foreground, colors.background],
    ["primary text", colors.primaryForeground, colors.primary],
    ["secondary text", colors.secondaryForeground, colors.secondary],
    ["accent text", colors.accentForeground, colors.accent],
  ])("%s meets WCAG AA (4.5:1)", (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("stores percentages as integer basis points", () => {
    expect(defaultBrand.charges.serviceChargeBps).toBe(1000);
    expect(Number.isInteger(defaultBrand.charges.vatBps)).toBe(true);
  });
});
