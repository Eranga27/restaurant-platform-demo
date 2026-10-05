import type { Brand } from "@/config/brand";
import { DAY_KEYS, type DayKey, type OpeningHours } from "@/lib/hours";

/**
 * Table booking rules (docs/DECISIONS.md D42), shared by the booking form and
 * the server. Pure functions; times are Sri Lanka time.
 */

export type ReservationRules = Brand["reservations"];

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** "2026-10-05" + "19:30" → the instant, in Sri Lanka time (UTC+05:30, no daylight saving). */
export function colomboInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

/** The weekday of a calendar date. */
export function dayOf(date: string): DayKey {
  // Noon UTC is the same calendar day in Colombo.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return DAY_KEYS[(day + 6) % 7]!;
}

/** How long a table is held for a party. */
export function seatingMinutes(partySize: number, rules: ReservationRules): number {
  return partySize >= rules.largePartySize ? rules.largePartyMinutes : rules.seatingMinutes;
}

/** Seats bookable online at a branch; the rest are kept for walk-ins. */
export function onlineSeats(capacity: number, rules: ReservationRules): number {
  return Math.floor((capacity * rules.onlineShareBps) / 10_000);
}

/** Calendar dates that can be booked, from today. */
export function bookableDates(now: Date, rules: ReservationRules): string[] {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" });
  return Array.from({ length: rules.maxDaysAhead }, (_, i) =>
    format.format(new Date(now.getTime() + i * 86_400_000)),
  );
}

/**
 * Start times on a date: every slot from opening until `lastSeatingMinutes`
 * before closing, and at least `minNoticeMinutes` from now.
 */
export function reservationTimes(
  hours: OpeningHours,
  date: string,
  now: Date,
  rules: ReservationRules,
): string[] {
  const earliest = now.getTime() + rules.minNoticeMinutes * 60_000;
  const latest = now.getTime() + rules.maxDaysAhead * 86_400_000;
  const times = new Set<string>();
  for (const [open, close] of hours[dayOf(date)]) {
    const start = toMinutes(open);
    let end = toMinutes(close);
    if (end <= start) end = 24 * 60; // open past midnight: seat until midnight
    const lastStart = end - rules.lastSeatingMinutes;
    for (
      let m = Math.ceil(start / rules.slotMinutes) * rules.slotMinutes;
      m <= lastStart;
      m += rules.slotMinutes
    ) {
      const at = colomboInstant(date, toTime(m)).getTime();
      if (at >= earliest && at <= latest) times.add(toTime(m));
    }
  }
  return [...times].sort();
}

export type Booking = { startsAt: Date; endsAt: Date; partySize: number };

/** Seats taken at the busiest moment in a window (the same rule as the database's booked_seats()). */
export function bookedSeats(bookings: Booking[], start: Date, end: Date): number {
  const moments = [
    start.getTime(),
    ...bookings
      .map((b) => b.startsAt.getTime())
      .filter((t) => t > start.getTime() && t < end.getTime()),
  ];
  return Math.max(
    0,
    ...moments.map((t) =>
      bookings
        .filter((b) => b.startsAt.getTime() <= t && b.endsAt.getTime() > t)
        .reduce((sum, b) => sum + b.partySize, 0),
    ),
  );
}

export type SlotAvailability = { time: string; available: boolean };

/** Every start time on a date, and whether a party of this size fits. */
export function availability(options: {
  hours: OpeningHours;
  date: string;
  partySize: number;
  capacity: number;
  bookings: Booking[];
  rules: ReservationRules;
  now: Date;
}): SlotAvailability[] {
  const { hours, date, partySize, capacity, bookings, rules, now } = options;
  const limit = onlineSeats(capacity, rules);
  const minutes = seatingMinutes(partySize, rules);
  return reservationTimes(hours, date, now, rules).map((time) => {
    const start = colomboInstant(date, time);
    const end = new Date(start.getTime() + minutes * 60_000);
    return { time, available: bookedSeats(bookings, start, end) + partySize <= limit };
  });
}
