import { describe, expect, it } from "vitest";

import { defaultBrand } from "@/config/brand";
import type { OpeningHours } from "@/lib/hours";
import {
  availability,
  bookableDates,
  bookedSeats,
  colomboInstant,
  dayOf,
  onlineSeats,
  reservationTimes,
  seatingMinutes,
} from "@/lib/reservations/slots";

const rules = defaultBrand.reservations;
const hours: OpeningHours = {
  mon: [["11:00", "22:30"]],
  tue: [["11:00", "22:30"]],
  wed: [["11:00", "22:30"]],
  thu: [["11:00", "22:30"]],
  fri: [["11:00", "23:00"]],
  sat: [["08:00", "23:00"]],
  sun: [],
};
/** Monday 5 October 2026, 09:00 in Colombo. */
const MORNING = new Date("2026-10-05T09:00:00+05:30");

describe("reservation times", () => {
  it("offers every 30 minutes until an hour before closing", () => {
    const times = reservationTimes(hours, "2026-10-06", MORNING, rules);
    expect(times[0]).toBe("11:00");
    expect(times.at(-1)).toBe("21:30");
    expect(times).toHaveLength(22);
  });

  it("needs two hours' notice", () => {
    const now = new Date("2026-10-05T12:10:00+05:30");
    expect(reservationTimes(hours, "2026-10-05", now, rules)[0]).toBe("14:30");
  });

  it("offers nothing on closed days", () => {
    expect(dayOf("2026-10-11")).toBe("sun");
    expect(reservationTimes(hours, "2026-10-11", MORNING, rules)).toEqual([]);
  });

  it("lists bookable dates from today, in Colombo time", () => {
    const lateEvening = new Date("2026-10-05T23:45:00+05:30"); // 18:15 UTC
    const dates = bookableDates(lateEvening, rules);
    expect(dates[0]).toBe("2026-10-05");
    expect(dates).toHaveLength(rules.maxDaysAhead);
  });
});

describe("capacity", () => {
  const at = (time: string, partySize: number, minutes = 90) => {
    const startsAt = colomboInstant("2026-10-06", time);
    return { startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60_000), partySize };
  };

  it("holds larger parties for longer and keeps seats for walk-ins", () => {
    expect(seatingMinutes(4, rules)).toBe(90);
    expect(seatingMinutes(8, rules)).toBe(120);
    expect(onlineSeats(80, rules)).toBe(48);
  });

  it("counts the busiest moment, not every booking in the window", () => {
    const bookings = [at("12:00", 10), at("13:30", 10)]; // back to back, never together
    expect(
      bookedSeats(
        bookings,
        colomboInstant("2026-10-06", "12:45"),
        colomboInstant("2026-10-06", "14:15"),
      ),
    ).toBe(10);
    const overlapping = [at("12:00", 10), at("12:30", 10)];
    expect(
      bookedSeats(
        overlapping,
        colomboInstant("2026-10-06", "12:45"),
        colomboInstant("2026-10-06", "14:15"),
      ),
    ).toBe(20);
  });

  it("marks slots full when a party wouldn't fit", () => {
    // 20 seats, 12 bookable online; 8 already booked from 19:00.
    const slots = availability({
      hours,
      date: "2026-10-06",
      partySize: 6,
      capacity: 20,
      bookings: [at("19:00", 8)],
      rules,
      now: MORNING,
    });
    const byTime = Object.fromEntries(slots.map((s) => [s.time, s.available]));
    expect(byTime["17:00"]).toBe(true);
    expect(byTime["18:00"]).toBe(false); // runs into the 19:00 booking
    expect(byTime["19:30"]).toBe(false);
    expect(byTime["20:30"]).toBe(true);
  });
});
