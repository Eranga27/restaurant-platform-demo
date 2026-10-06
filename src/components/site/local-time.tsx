"use client";

import { useEffect, useState } from "react";

const format = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Colombo",
  hour: "2-digit",
  minute: "2-digit",
});

/** The time in Colombo, updated each minute. Empty until the page runs, so the server and browser agree. */
export function LocalTime({ className }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNow(format.format(new Date()));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return (
    <time className={className} suppressHydrationWarning>
      {now ?? "--:--"}
    </time>
  );
}
