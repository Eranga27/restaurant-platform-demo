"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type DishTab = { key: string; label: string; panel: React.ReactNode };

/**
 * Dishes by category, as tabs: "Most ordered", then the menu's main
 * categories. Every panel is in the page (server-rendered, so search engines
 * and no-JavaScript visitors get them all); switching crossfades the new one
 * in, its cards following one after another. Arrow keys, Home and End move
 * between tabs (WAI-ARIA tabs pattern). A pill slides behind the selected tab
 * (globals.css, .tab-pill); until it has been placed, the tab itself is filled.
 */
export function DishTabs({ tabs, label }: { tabs: DishTab[]; label: string }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // Place the pill on the selected tab, and again whenever the row changes size.
  useEffect(() => {
    const row = list.current;
    const marker = pill.current;
    if (!row || !marker) return;
    const place = () => {
      const tab = buttons.current[active];
      if (!tab) return;
      marker.style.setProperty("--x", `${tab.offsetLeft}px`);
      marker.style.setProperty("--y", `${tab.offsetTop}px`);
      marker.style.setProperty("--w", `${tab.offsetWidth}px`);
      marker.style.setProperty("--h", `${tab.offsetHeight}px`);
      // The first placement jumps there; after that the pill slides.
      if (!row.dataset.pill) {
        row.dataset.pill = "placed";
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            row.dataset.pill = "ready";
          }),
        );
      }
    };
    place();
    const resize = new ResizeObserver(place);
    resize.observe(row);
    return () => resize.disconnect();
  }, [active]);

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div>
      <div
        ref={list}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative -mx-4 mb-8 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <span ref={pill} aria-hidden className="tab-pill" />
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${tab.key}`}
            aria-selected={i === active}
            aria-controls={`${id}-panel-${tab.key}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              "relative min-h-11 shrink-0 rounded-full border px-5 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,scale] duration-300 active:scale-[0.97]",
              i === active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card hover:border-foreground/40",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${id}-panel-${tab.key}`}
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={i !== active}
          className="dish-panel"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
