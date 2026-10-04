"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime, type OpeningHours } from "@/lib/hours";
import { scheduleSlots } from "@/lib/orders/slots";
import { useNow } from "@/lib/use-now";

export type Schedule = { mode: "asap" } | { mode: "later"; date: string; time: string };

export function SchedulePicker({
  hours,
  value,
  onChange,
}: {
  hours: OpeningHours;
  value: Schedule;
  onChange: (value: Schedule) => void;
}) {
  const t = useTranslations("Checkout");
  const tb = useTranslations("Branches");
  const locale = useLocale();
  const now = useNow();
  const days = useMemo(() => (now ? scheduleSlots(hours, now) : []), [hours, now]);

  const dayLabel = (date: string, offset: number) => {
    if (offset === 0) return t("today");
    if (offset === 1) return t("tomorrow");
    const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" })
      .format(new Date(`${date}T12:00:00Z`))
      .toLowerCase()
      .slice(0, 3) as "mon";
    return tb(`days.${day}`);
  };

  const selectedDay = value.mode === "later" ? days.find((d) => d.date === value.date) : undefined;

  function chooseLater() {
    const first = days.find((d) => d.slots.length > 0);
    if (first) onChange({ mode: "later", date: first.date, time: first.slots[0]! });
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={value.mode}
        onValueChange={(mode) => (mode === "asap" ? onChange({ mode: "asap" }) : chooseLater())}
        className="grid gap-2 sm:grid-cols-2"
      >
        <Label
          htmlFor="when-asap"
          className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
        >
          <RadioGroupItem value="asap" id="when-asap" className="mt-0.5" />
          <span>
            <span className="block font-semibold">{t("asap")}</span>
            <span className="text-sm text-muted-foreground">{t("asapHint")}</span>
          </span>
        </Label>
        <Label
          htmlFor="when-later"
          className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
        >
          <RadioGroupItem
            value="later"
            id="when-later"
            className="mt-0.5"
            disabled={!days.some((d) => d.slots.length)}
          />
          <span className="block font-semibold">{t("later")}</span>
        </Label>
      </RadioGroup>

      {value.mode === "later" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span id="schedule-day" className="text-sm font-medium">
              {t("day")}
            </span>
            <Select
              value={value.date}
              onValueChange={(date) => {
                const day = days.find((d) => d.date === date);
                onChange({ mode: "later", date, time: day?.slots[0] ?? "" });
              }}
            >
              <SelectTrigger aria-labelledby="schedule-day" className="h-10 w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {days.map((d) => (
                  <SelectItem key={d.date} value={d.date} disabled={d.slots.length === 0}>
                    {dayLabel(d.date, d.dayOffset)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span id="schedule-time" className="text-sm font-medium">
              {t("time")}
            </span>
            {selectedDay && selectedDay.slots.length > 0 ? (
              <Select value={value.time} onValueChange={(time) => onChange({ ...value, time })}>
                <SelectTrigger aria-labelledby="schedule-time" className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {selectedDay.slots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatTime(slot, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSlots")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
