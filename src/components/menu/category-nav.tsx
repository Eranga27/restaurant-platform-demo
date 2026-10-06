"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Sticky category tabs that follow the scroll position. */
export function CategoryNav({ categories }: { categories: { slug: string; name: string }[] }) {
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

  return (
    <nav
      aria-label={t("categories")}
      className="sticky top-18 z-30 -mx-4 border-b border-current/10 bg-background/90 backdrop-blur-md sm:-mx-6 lg:-mx-8"
    >
      <ul
        ref={listRef}
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8"
      >
        {categories.map((c) => (
          <li key={c.slug} data-slug={c.slug} className="shrink-0">
            <a
              href={`#${c.slug}`}
              aria-current={active === c.slug ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-4 font-mono text-[0.7rem] tracking-[0.15em] whitespace-nowrap uppercase transition-colors",
                active === c.slug
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              {c.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
