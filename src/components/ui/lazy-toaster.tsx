"use client";

import dynamic from "next/dynamic";

/**
 * The toast area, loaded just after the page instead of with it. Toasts only
 * follow something the visitor did, by which time it's there.
 */
export const LazyToaster = dynamic(() => import("./sonner").then((m) => m.Toaster), {
  ssr: false,
});
