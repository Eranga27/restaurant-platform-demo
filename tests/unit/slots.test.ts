import { describe, expect, it } from "vitest";

import type { OpeningHours } from "@/lib/hours";
import { scheduleSlots, slotToIso } from "@/lib/orders/slots";

const elevenToTen: OpeningHours = {
  mon: [["11:00", "22:00"]],
  tue: [["11:00", "22:00"]],
  wed: [["11:00", "22:00"]],
  thu: [["11:00", "22:00"]],
  fri: [["11:00", "22:00"]],
  sat: [["11:00", "22:00"]],
  sun: [],
};

describe("scheduleSlots", () => {
  it("offers 15-minute slots from opening, stopping 15 minutes before close", () => {
    const morning = new Date("2026-10-05T08:00:00+05:30"); // Monday
    const [today] = scheduleSlots(elevenToTen, morning);
    expect(today!.date).toBe("2026-10-05");
    expect(today!.slots[0]).toBe("11:00");
    expect(today!.slots.at(-1)).toBe("21:45");
    expect(today!.slots).toHaveLength(44);
  });

  it("starts at least 30 minutes from now, on a slot boundary", () => {
    const lunch = new Date("2026-10-05T12:07:00+05:30");
    const [today] = scheduleSlots(elevenToTen, lunch);
    expect(today!.slots[0]).toBe("12:45");
  });

  it("returns empty days when the branch is closed, and covers three days", () => {
    const saturdayNight = new Date("2026-10-10T21:50:00+05:30");
    const days = scheduleSlots(elevenToTen, saturdayNight);
    expect(days.map((d) => d.date)).toEqual(["2026-10-10", "2026-10-11", "2026-10-12"]);
    expect(days[0]!.slots).toEqual([]); // too late on Saturday
    expect(days[1]!.slots).toEqual([]); // closed on Sunday
    expect(days[2]!.slots[0]).toBe("11:00"); // Monday
  });

  it("uses Sri Lanka time whatever the server's time zone", () => {
    // 23:00 UTC on Sunday is 04:30 on Monday in Colombo.
    const days = scheduleSlots(elevenToTen, new Date("2026-10-04T23:00:00Z"));
    expect(days[0]!.date).toBe("2026-10-05");
    expect(days[0]!.slots[0]).toBe("11:00");
  });

  it("builds ISO timestamps with the Sri Lanka offset", () => {
    expect(slotToIso("2026-10-05", "12:30")).toBe("2026-10-05T12:30:00+05:30");
  });
});
