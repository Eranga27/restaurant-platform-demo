"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * On phones, the two ways in pinned to the bottom of the home page once the
 * hero has scrolled away, and out of the way again when the footer (with its
 * own invitation) comes into view. Not shown on large screens, where the
 * header's buttons stay in reach.
 */
export function StickyOrderBar({
  watch,
  label,
  children,
}: {
  /** The element whose leaving the screen brings the bar in (the hero's id). */
  watch: string;
  /** Names the bar for screen readers. */
  label: string;
  children: React.ReactNode;
}) {
  const [heroGone, setHeroGone] = useState(false);
  const [footerShown, setFooterShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(watch);
    const footer = document.querySelector("footer");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) setHeroGone(!entry.isIntersecting);
        else setFooterShown(entry.isIntersecting);
      }
    });
    if (hero) observer.observe(hero);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [watch]);

  const shown = heroGone && !footerShown;
  return (
    <div
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-300 ease-out-soft md:hidden",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div
        role="group"
        aria-label={label}
        className="flex gap-2 rounded-2xl bg-foreground p-2 text-background shadow-lifted"
      >
        {children}
      </div>
    </div>
  );
}
