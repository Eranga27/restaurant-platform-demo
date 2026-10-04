/**
 * Opening hours in Asia/Colombo time. Ranges are ["HH:MM", "HH:MM"]; a close
 * time earlier than the open time runs past midnight into the next day.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type OpeningHours = Record<DayKey, [string, string][]>;

export type OpenStatus =
  { open: true; closesAt: string } | { open: false; opensAt: { day: DayKey; time: string } | null };

const TIME_ZONE = "Asia/Colombo";

/** The weekday and minutes since midnight in Sri Lanka for a given instant. */
export function colomboClock(now: Date): { day: DayKey; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as DayKey;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};

const dayOffset = (day: DayKey, offset: number): DayKey =>
  DAY_KEYS[(DAY_KEYS.indexOf(day) + offset + 7) % 7]!;

export function openStatus(hours: OpeningHours, now: Date): OpenStatus {
  const { day, minutes } = colomboClock(now);

  // Today's ranges, plus yesterday's ranges that run past midnight.
  for (const [open, close] of hours[day]) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return { open: true, closesAt: close };
  }
  for (const [open, close] of hours[dayOffset(day, -1)]) {
    if (toMinutes(close) <= toMinutes(open) && minutes < toMinutes(close)) {
      return { open: true, closesAt: close };
    }
  }

  // Next opening: later today, then the following days.
  const laterToday = hours[day]
    .map(([open]) => open)
    .filter((open) => toMinutes(open) > minutes)
    .sort();
  if (laterToday[0]) return { open: false, opensAt: { day, time: laterToday[0] } };
  for (let i = 1; i <= 7; i++) {
    const next = dayOffset(day, i);
    const first = hours[next].map(([open]) => open).sort()[0];
    if (first) return { open: false, opensAt: { day: next, time: first } };
  }
  return { open: false, opensAt: null };
}

/** Groups consecutive days with identical hours, for compact display. */
export function groupHours(
  hours: OpeningHours,
): { from: DayKey; to: DayKey; ranges: [string, string][] }[] {
  const groups: { from: DayKey; to: DayKey; ranges: [string, string][] }[] = [];
  for (const day of DAY_KEYS) {
    const ranges = hours[day];
    const last = groups.at(-1);
    if (last && JSON.stringify(last.ranges) === JSON.stringify(ranges)) last.to = day;
    else groups.push({ from: day, to: day, ranges });
  }
  return groups;
}

/** "22:30" → "10:30 pm" (or the locale's equivalent). */
export function formatTime(time: string, locale: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  // A fixed UTC date, formatted in UTC, so the server's time zone never matters.
  const date = new Date(Date.UTC(2026, 0, 5, h, m));
  return new Intl.DateTimeFormat(`${locale}-LK`, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
}
