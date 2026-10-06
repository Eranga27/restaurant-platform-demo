"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/** Animation classes by the link's transition type (src/lib/transitions.ts). */
const BY_TYPE = {
  lamp: "page-lamp",
  curtain: "page-curtain",
  home: "page-home",
  default: "page",
};

/**
 * Animates between pages with the browser's View Transitions (React
 * <ViewTransition>; styles in globals.css). The link's transition type picks
 * the animation: "lamp" opens the new page in a circle from the click,
 * "curtain" raises it over the old one, "home" fades through; anything else
 * (and the browser's back and forward) fades out and rises in. Keyed by path,
 * so changes within a page (filters, ?item= links, live updates) don't
 * animate. Browsers without support just navigate.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter={BY_TYPE} exit={BY_TYPE} default="none">
      {/* One element, so the page moves as one picture rather than in pieces. */}
      <div className="flex flex-1 flex-col bg-background">{children}</div>
    </ViewTransition>
  );
}
