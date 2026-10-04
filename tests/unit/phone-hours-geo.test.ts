import { describe, expect, it } from "vitest";

import { distanceKm, byDistance } from "@/lib/geo";
import { colomboClock, formatTime, groupHours, openStatus, type OpeningHours } from "@/lib/hours";
import {
  formatPhone,
  isSriLankanMobile,
  normalizeSriLankanPhone,
  whatsappNumber,
} from "@/lib/phone";

describe("normalizeSriLankanPhone", () => {
  it.each([
    ["077 123 4567", "+94771234567"],
    ["0771234567", "+94771234567"],
    ["+94 77 123 4567", "+94771234567"],
    ["94771234567", "+94771234567"],
    ["0094-77-123-4567", "+94771234567"],
    ["011 234 5678", "+94112345678"],
    ["(081) 222 3333", "+94812223333"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeSriLankanPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "077 123 456", "+44 20 7946 0958", "00771234567", "+940771234567"])(
    "rejects %s",
    (input) => {
      expect(normalizeSriLankanPhone(input)).toBeNull();
    },
  );

  it("tells mobiles from landlines", () => {
    expect(isSriLankanMobile("+94771234567")).toBe(true);
    expect(isSriLankanMobile("+94112345678")).toBe(false);
  });

  it("formats for display and for WhatsApp links", () => {
    expect(formatPhone("+94110000700")).toBe("+94 11 000 0700");
    expect(formatPhone("not a number")).toBe("not a number");
    expect(whatsappNumber("+94770000700")).toBe("94770000700");
  });
});

const COLOMBO_07: OpeningHours = {
  mon: [["11:00", "22:30"]],
  tue: [["11:00", "22:30"]],
  wed: [["11:00", "22:30"]],
  thu: [["11:00", "22:30"]],
  fri: [["11:00", "23:30"]],
  sat: [["11:00", "01:00"]],
  sun: [],
};

// 2026-10-05 is a Monday.
const at = (iso: string) => new Date(`${iso}+05:30`);

describe("opening hours", () => {
  it("reads the Sri Lankan clock regardless of the server's time zone", () => {
    expect(colomboClock(new Date("2026-10-05T04:30:00Z"))).toEqual({ day: "mon", minutes: 600 });
  });

  it("is open inside a range and reports the closing time", () => {
    expect(openStatus(COLOMBO_07, at("2026-10-05T12:00:00"))).toEqual({
      open: true,
      closesAt: "22:30",
    });
  });

  it("is closed before opening and reports when it opens", () => {
    expect(openStatus(COLOMBO_07, at("2026-10-05T10:00:00"))).toEqual({
      open: false,
      opensAt: { day: "mon", time: "11:00" },
    });
  });

  it("treats the closing minute as closed", () => {
    expect(openStatus(COLOMBO_07, at("2026-10-05T22:30:00")).open).toBe(false);
  });

  it("handles ranges past midnight", () => {
    // Saturday 11:00 to Sunday 01:00
    expect(openStatus(COLOMBO_07, at("2026-10-11T00:30:00"))).toEqual({
      open: true,
      closesAt: "01:00",
    });
    expect(openStatus(COLOMBO_07, at("2026-10-10T23:45:00"))).toEqual({
      open: true,
      closesAt: "01:00",
    });
  });

  it("skips closed days when finding the next opening", () => {
    expect(openStatus(COLOMBO_07, at("2026-10-11T02:00:00"))).toEqual({
      open: false,
      opensAt: { day: "mon", time: "11:00" },
    });
  });

  it("groups consecutive days with the same hours", () => {
    expect(groupHours(COLOMBO_07)).toEqual([
      { from: "mon", to: "thu", ranges: [["11:00", "22:30"]] },
      { from: "fri", to: "fri", ranges: [["11:00", "23:30"]] },
      { from: "sat", to: "sat", ranges: [["11:00", "01:00"]] },
      { from: "sun", to: "sun", ranges: [] },
    ]);
  });
});

describe("distance", () => {
  const colombo = { lat: 6.9112, lng: 79.8556 };
  const kandy = { lat: 7.2936, lng: 80.6408 };

  it("matches the known Colombo to Kandy straight-line distance", () => {
    expect(distanceKm(colombo, kandy)).toBeGreaterThan(94);
    expect(distanceKm(colombo, kandy)).toBeLessThan(98);
  });

  it("sorts places nearest first", () => {
    const sorted = byDistance(
      [
        { id: "kandy", ...kandy },
        { id: "colombo", ...colombo },
      ],
      { lat: 6.87, lng: 79.89 },
    );
    expect(sorted.map((p) => p.id)).toEqual(["colombo", "kandy"]);
    expect(sorted[0]!.distanceKm).toBeLessThan(6);
  });
});

describe("formatTime", () => {
  it("formats 24-hour times as 12-hour for English", () => {
    expect(formatTime("22:30", "en").replace(/ /g, " ").toLowerCase()).toBe("10:30 pm");
    expect(formatTime("11:00", "en").replace(/ /g, " ").toLowerCase()).toBe("11:00 am");
  });

  it("produces something for Sinhala and Tamil", () => {
    expect(formatTime("22:30", "si")).toMatch(/10/);
    expect(formatTime("22:30", "ta")).toMatch(/10/);
  });
});
