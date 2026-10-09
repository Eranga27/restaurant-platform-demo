"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Sticky category tabs, each with its number of dishes, that follow the scroll
 * position. A red pill slides to the current one (globals.css, .tab-pill).
 */
export function CategoryNav({
  categories,
}: {
  categories: { slug: string; name: string; count: number }[];
}) {
  const t = useTranslations("Menu");
  const [active, setActive] = useState(categories[0]?.slug);
  const listRef = useRef<HTMLUListElement>(null);
  const slugs = categories.map((c) => c.slug).join(",");

  useEffect(() => {
    const sections = slugs
      .split(",")
      .map((slug) => document.getElementById(slug))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band just below the sticky header and tabs.
      { rootMargin: "-170px 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [slugs]);

  // Keep the active tab in view on small screens.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  // Move the pill to the active tab, and again whenever the row changes size.
  useEffect(() => {
    const row = listRef.current;
    const marker = row?.querySelector<HTMLElement>(".tab-pill");
    if (!row || !marker) return;
    const place = () => {
      const link = row.querySelector<HTMLElement>(`[data-slug="${active}"] > a`);
      if (!link) return;
      marker.style.setProperty("--x", `${link.offsetLeft}px`);
      marker.style.setProperty("--y", `${link.offsetTop}px`);
      marker.style.setProperty("--w", `${link.offsetWidth}px`);
      marker.style.setProperty("--h", `${link.offsetHeight}px`);
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

  return (
    <nav
      aria-label={t("categories")}
      className="sticky top-18 z-30 -mx-4 bg-background/85 backdrop-blur-md sm:-mx-6 lg:-mx-8"
    >
      <ul
        ref={listRef}
        className="relative flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3 [--pill-bg:var(--primary)] sm:px-6 lg:px-8"
      >
        <li aria-hidden className="tab-pill" />
        {categories.map((c) => (
          <li key={c.slug} data-slug={c.slug} className="shrink-0">
            <a
              href={`#${c.slug}`}
              aria-current={active === c.slug ? "true" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,scale] duration-300 active:scale-[0.97]",
                active === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {c.name}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active === c.slug ? "bg-white/20" : "bg-muted text-muted-foreground",
                )}
              >
                {c.count}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
