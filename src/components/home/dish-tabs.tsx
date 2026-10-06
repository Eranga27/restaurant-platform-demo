"use client";

import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type DishTab = { key: string; label: string; panel: React.ReactNode };

/**
 * Dishes by category, as tabs: "Most ordered", then the menu's main
 * categories. Every panel is in the page (server-rendered, so search engines
 * and no-JavaScript visitors get them all); switching crossfades the new one
 * in, its cards following one after another. Arrow keys, Home and End move
 * between tabs (WAI-ARIA tabs pattern).
 */
export function DishTabs({ tabs, label }: { tabs: DishTab[]; label: string }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

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
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="-mx-4 mb-8 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
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
              "min-h-11 shrink-0 rounded-full border px-5 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,scale] duration-200 active:scale-[0.97]",
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
