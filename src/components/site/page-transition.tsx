"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Animates between pages with the browser's View Transitions (React
 * <ViewTransition>; styles in globals.css): the old page fades out, the new
 * one rises in. Keyed by path, so changes within a page (filters, ?item=
 * links, live updates) don't animate. Browsers without support just
 * navigate.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
