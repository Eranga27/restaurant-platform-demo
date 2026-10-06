"use client";

import { useEffect, useRef } from "react";

/**
 * While the hero is under the header, asks the header for light text on a
 * transparent background (data-header-tone="light" on <html>). Renders an
 * invisible marker spanning the hero.
 */
export function HeaderTone() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) root.dataset.headerTone = "light";
        else delete root.dataset.headerTone;
      },
      // The header is 4.5rem tall: light while any of the hero is below it.
      { rootMargin: "-72px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete root.dataset.headerTone;
    };
  }, []);
  return <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0" />;
}
