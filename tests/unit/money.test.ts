import { describe, expect, it } from "vitest";

import { applyBasisPoints, formatLKR } from "@/lib/money";

describe("formatLKR", () => {
  it("formats cents as rupees with grouping and two decimals", () => {
    expect(formatLKR(125_000)).toBe("Rs. 1,250.00");
    expect(formatLKR(0)).toBe("Rs. 0.00");
    expect(formatLKR(5)).toBe("Rs. 0.05");
    expect(formatLKR(123_456_789)).toBe("Rs. 1,234,567.89");
  });

  it("puts the sign before the currency for negative amounts", () => {
    expect(formatLKR(-10_000)).toBe("-Rs. 100.00");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatLKR(10.5)).toThrow(TypeError);
    expect(() => formatLKR(Number.NaN)).toThrow(TypeError);
  });
});

describe("applyBasisPoints", () => {
  it("applies a percentage expressed in basis points", () => {
    expect(applyBasisPoints(125_000, 1000)).toBe(12_500); // 10%
    expect(applyBasisPoints(137_500, 1800)).toBe(24_750); // 18%
  });

  it("rounds half up to the nearest cent", () => {
    expect(applyBasisPoints(5, 1000)).toBe(1); // 0.5 → 1
    expect(applyBasisPoints(4, 1000)).toBe(0); // 0.4 → 0
  });

  it("rejects fractional basis points", () => {
    expect(() => applyBasisPoints(100, 10.5)).toThrow(TypeError);
  });
});
