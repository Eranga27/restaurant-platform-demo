"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { StarRating } from "@/components/site/star-rating";

export type ReviewView = {
  id: string;
  body: string;
  rating: number;
  authorName: string;
  branchName: string | null;
};

const ADVANCE_MS = 8000;

/**
 * Guests' words, one at a time and large. Moves on by itself every few
 * seconds, except while the pointer or keyboard focus is on it, or for
 * visitors who prefer reduced motion.
 */
export function ReviewCarousel({ reviews }: { reviews: ReviewView[] }) {
  const t = useTranslations("Home");
  const tc = useTranslations("Common");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = reviews.length;
  const review = reviews[index % count]!;

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, paused, count]);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end"
    >
      <figure
        key={review.id}
        aria-live="polite"
        className="animate-in duration-700 fade-in slide-in-from-bottom-3"
      >
        <StarRating rating={review.rating} label={tc("rating", { rating: review.rating })} />
        <blockquote className="mt-6 font-display text-display-lg text-pretty italic">
          “{review.body}”
        </blockquote>
        <figcaption className="mt-8 font-mono text-xs tracking-[0.2em] uppercase">
          <span>{review.authorName}</span>
          {review.branchName && <span className="opacity-80"> · {review.branchName}</span>}
        </figcaption>
      </figure>
      {count > 1 && (
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tracking-[0.2em] tabular-nums opacity-70">
            {t("reviewCount", { current: (index % count) + 1, total: count })}
          </span>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("previousReview")}
            className="flex size-12 items-center justify-center rounded-full border border-current/25 transition-colors hover:bg-current/10"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("nextReview")}
            className="flex size-12 items-center justify-center rounded-full border border-current/25 transition-colors hover:bg-current/10"
          >
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
