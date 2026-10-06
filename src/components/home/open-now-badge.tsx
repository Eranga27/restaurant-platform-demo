"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatTime, openStatus, type OpeningHours } from "@/lib/hours";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

/**
 * "Open now · 3 kitchens cooking", or when every kitchen is shut, when the
 * first one opens again. Computed in the browser, so a cached page is never
 * stale; renders nothing until it knows the time.
 */
export function OpenNowBadge({
  hours,
  className,
}: {
  /** Opening hours of every branch. */
  hours: OpeningHours[];
  className?: string;
}) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const now = useNow();
  if (!now || hours.length === 0) return null;

  const statuses = hours.map((h) => openStatus(h, now));
  const open = statuses.filter((s) => s.open).length;
  const next = statuses.flatMap((s) => (!s.open && s.opensAt ? [s.opensAt.time] : [])).sort()[0];
  if (!open && !next) return null;

  return (
    <p
      className={cn(
        "inline-flex animate-in items-center gap-2.5 rounded-full border border-current/20 bg-black/25 px-3.5 py-1.5 text-sm backdrop-blur-sm duration-500 fade-in",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          // Lifted for the dark video behind it.
          open > 0 ? "bg-[color-mix(in_srgb,var(--success)_45%,white)]" : "bg-current opacity-60",
        )}
      />
      {open > 0
        ? t("openNowCooking", { count: open })
        : t("closedOpensAt", { time: formatTime(next!, locale) })}
    </p>
  );
}
