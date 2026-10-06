"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Chapter = { id: string; label: string };

/**
 * A small floating guide on large screens: which chapter of the page you're
 * in ("03 / 07 · Signatures") and a progress line, with arrows to move between
 * chapters. Reads the page's `[data-chapter]` sections. Hidden over the hero
 * and the footer.
 */
export function ChapterNav() {
  const t = useTranslations("Home");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [current, setCurrent] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
    const found = sections.map((s) => ({ id: s.id, label: s.dataset.chapter ?? "" }));
    const frame = requestAnimationFrame(() => setChapters(found));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(sections.indexOf(entry.target as HTMLElement));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    const footer = document.querySelector("footer");
    const footerObserver = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setCurrent(-1);
    });
    if (footer) footerObserver.observe(footer);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      footerObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (chapters.length === 0) return null;
  const visible = current >= 0;
  const chapter = chapters[Math.max(0, current)]!;
  const go = (step: number) => {
    const next = chapters[current + step];
    if (next) document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      aria-label={t("chapters")}
      className={`fixed bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-1 rounded-full surface-ink p-1.5 shadow-lifted transition-[opacity,translate] duration-500 lg:flex ${visible ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={current <= 0}
        aria-label={t("previousChapter")}
        className="flex size-8 items-center justify-center rounded-full text-sm hover:bg-white/10 disabled:opacity-30"
      >
        ←
      </button>
      <span className="flex min-w-48 flex-col gap-1 px-3 font-mono text-[0.65rem] tracking-[0.2em] uppercase">
        <span>
          <span className="text-highlight tabular-nums">
            {String(Math.max(0, current) + 1).padStart(2, "0")} /{" "}
            {String(chapters.length).padStart(2, "0")}
          </span>{" "}
          · {chapter.label}
        </span>
        <span aria-hidden className="h-px w-full bg-white/15">
          <span className="block h-full bg-highlight" style={{ width: `${progress * 100}%` }} />
        </span>
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={current >= chapters.length - 1}
        aria-label={t("nextChapter")}
        className="flex size-8 items-center justify-center rounded-full text-sm hover:bg-white/10 disabled:opacity-30"
      >
        →
      </button>
    </nav>
  );
}
