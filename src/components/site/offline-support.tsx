"use client";

import { useEffect } from "react";

/**
 * Registers the site's service worker (public/offline-sw.js), which shows an
 * offline page when the connection drops. Production builds only: in
 * development it would sit between the browser and hot reloading.
 */
export function OfflineSupport() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/offline-sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Not supported or blocked (private mode): the site works the same without it.
      });
  }, []);
  return null;
}
