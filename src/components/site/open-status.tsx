"use client";

import { useLocale, useTranslations } from "next-intl";

import { colomboClock, formatTime, openStatus, type OpeningHours } from "@/lib/hours";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/** "Open now · Closes at 10:30 pm", computed in the browser so it's never stale. */
export function OpenStatus({ hours, className }: { hours: OpeningHours; className?: string }) {
  const t = useTranslations("Branches");
  const locale = useLocale();
  const now = useNow();

  if (!now)
    return <span className={cn("inline-block h-5 w-36 rounded bg-muted", className)} aria-hidden />;

  const status = openStatus(hours, now);
  const today = colomboClock(now).day;

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden
        className={cn("size-2 rounded-full", status.open ? "bg-success" : "bg-muted-foreground")}
      />
      <span className={cn("font-medium", status.open ? "text-success" : "text-muted-foreground")}>
        {status.open ? t("openNow") : t("closed")}
      </span>
      <span className="text-muted-foreground">
        {status.open
          ? t("closesAt", { time: formatTime(status.closesAt, locale) })
          : status.opensAt
            ? status.opensAt.day === today
              ? t("opensToday", { time: formatTime(status.opensAt.time, locale) })
              : t("opensAt", {
                  day: t(`days.${status.opensAt.day}`),
                  time: formatTime(status.opensAt.time, locale),
                })
            : null}
      </span>
    </span>
  );
}
