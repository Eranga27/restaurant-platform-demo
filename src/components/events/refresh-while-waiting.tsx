"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks the page every few seconds while a deposit is being confirmed. */
export function RefreshWhileWaiting({
  everyMs = 4000,
  forMs = 120_000,
}: {
  everyMs?: number;
  forMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - started > forMs) clearInterval(timer);
      else router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs, forMs]);
  return null;
}
