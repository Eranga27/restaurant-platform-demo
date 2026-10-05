import { describe, expect, it } from "vitest";

import { defaultBrand } from "@/config/brand";
import { brandOverrides, checkBrand, overridesFor } from "@/lib/admin/settings";

describe("brand settings", () => {
  it("stores only what differs from the defaults", () => {
    expect(overridesFor(defaultBrand)).toEqual({});
    const edited = {
      ...defaultBrand,
      name: "Lanka Bites",
      charges: { ...defaultBrand.charges, serviceChargeBps: 1200 },
    };
    expect(overridesFor(edited)).toEqual({
      name: "Lanka Bites",
      charges: { serviceChargeBps: 1200 },
    });
  });

  it("stores a changed list whole", () => {
    const packages = defaultBrand.events.packages.slice(0, 1);
    expect(
      brandOverrides(defaultBrand, {
        ...defaultBrand,
        events: { ...defaultBrand.events, packages },
      }),
    ).toEqual({ events: { packages } });
  });

  it("accepts the default brand", () => {
    expect(checkBrand(defaultBrand).ok).toBe(true);
  });

  it("refuses unreadable colours and invalid values", () => {
    const pale = {
      ...defaultBrand,
      colors: { ...defaultBrand.colors, primaryForeground: "#7a4a2a" },
    };
    const result = checkBrand(pale);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toMatch(/Text on the main colour/);

    expect(
      checkBrand({ ...defaultBrand, contact: { ...defaultBrand.contact, phone: "12345" } }).ok,
    ).toBe(false);
  });
});
