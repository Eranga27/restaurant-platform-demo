import { colomboClock, type DayKey, type OpeningHours } from "@/lib/hours";

import { SCHEDULE_LEAD_MINUTES, SCHEDULE_MAX_DAYS } from "./quote";

/**
 * Times a scheduled order can be placed for: every 15 minutes while the
 * branch is open, from 30 minutes from now up to 3 days ahead, in Sri Lanka
 * time. The server re-checks the chosen slot (quoteOrder).
 */

export const SLOT_MINUTES = 15;

export type SlotDay = { date: string; dayOffset: number; slots: string[] };

const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** The Colombo calendar date `offset` days after `now`. */
function colomboDate(now: Date, offset: number): { date: string; day: DayKey } {
  const shifted = new Date(now.getTime() + offset * 86_400_000);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo" }).format(shifted);
  return { date, day: colomboClock(shifted).day };
}

export function scheduleSlots(hours: OpeningHours, now: Date, days = SCHEDULE_MAX_DAYS): SlotDay[] {
  const earliest = now.getTime() + SCHEDULE_LEAD_MINUTES * 60_000;
  const latest = now.getTime() + SCHEDULE_MAX_DAYS * 86_400_000;
  const result: SlotDay[] = [];

  for (let offset = 0; offset < days; offset++) {
    const { date, day } = colomboDate(now, offset);
    const slots: string[] = [];
    for (const [open, close] of hours[day]) {
      const start = toMinutes(open);
      let end = toMinutes(close);
      if (end <= start) end = 24 * 60; // ranges past midnight: offer until midnight
      // Stop taking orders 15 minutes before closing.
      for (
        let m = Math.ceil(start / SLOT_MINUTES) * SLOT_MINUTES;
        m <= end - SLOT_MINUTES;
        m += SLOT_MINUTES
      ) {
        const at = new Date(`${date}T${toTime(m)}:00+05:30`).getTime();
        if (at >= earliest && at <= latest) slots.push(toTime(m));
      }
    }
    result.push({ date, dayOffset: offset, slots: [...new Set(slots)].sort() });
  }
  return result;
}

/** "2026-10-05" + "12:30" → ISO timestamp in Sri Lanka time. */
export const slotToIso = (date: string, time: string) => `${date}T${time}:00+05:30`;
