"use client";

import { useEffect, useRef } from "react";

/**
 * The moving part of the plates gallery (globals.css, .plates): on large
 * screens with scroll-driven animations, the section is pinned and its row of
 * plates slides sideways as the page scrolls down. This measures how far the
 * row has to travel (--travel), and when a plate gets keyboard focus, scrolls
 * the page to where that plate is in view, so focus is never hidden off to
 * the side. Elsewhere the row simply scrolls sideways.
 */
export function PlateTrack({ children }: { children: React.ReactNode }) {
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = track.current;
    const section = row?.closest<HTMLElement>(".plates");
    const pin = row?.parentElement;
    if (!row || !section || !pin) return;

    const measure = () => {
      const travel = Math.max(0, row.scrollWidth - pin.clientWidth);
      section.style.setProperty("--travel", `${travel}px`);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(row);
    resize.observe(pin);

    const pinned = () => getComputedStyle(pin).position === "sticky";
    const onFocus = (event: FocusEvent) => {
      if (!pinned()) return;
      const item = (event.target as Element).closest("li");
      if (!item) return;
      // While pinned, each pixel scrolled down moves the row one pixel left.
      const travel = Math.max(0, row.scrollWidth - pin.clientWidth);
      const shift = Math.min(travel, Math.max(0, item.offsetLeft - 32));
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + shift, behavior: "instant" });
    };
    row.addEventListener("focusin", onFocus);
    return () => {
      resize.disconnect();
      row.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <ul ref={track} className="plates-track">
      {children}
    </ul>
  );
}
