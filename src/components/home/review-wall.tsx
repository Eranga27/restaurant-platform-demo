"use client";

import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { StarRating } from "@/components/site/star-rating";

export type WallReview = {
  id: string;
  body: string;
  rating: number;
  authorName: string;
  branchName: string | null;
};

/**
 * Guests' words as cards on two rows sliding past in opposite directions
 * (globals.css, .review-wall), each card tilted a little like a note pinned
 * up. Movement pauses on hover or focus, and the button stops it for good
 * (WCAG 2.2.2). The second copy of each row only makes the loop seamless and
 * is hidden from screen readers. Still for reduced motion.
 */
export function ReviewWall({ reviews }: { reviews: WallReview[] }) {
  const t = useTranslations("Home");
  const tc = useTranslations("Common");
  const [paused, setPaused] = useState(false);
  const half = Math.ceil(reviews.length / 2);
  const rows = [reviews.slice(0, half), reviews.slice(half).length ? reviews.slice(half) : reviews];

  const card = (review: WallReview, i: number) => (
    <figure
      key={`${review.id}-${i}`}
      className="review-card"
      style={{ "--tilt": `${i % 2 ? 1.5 : -1.5}deg` } as React.CSSProperties}
    >
      <StarRating rating={review.rating} label={tc("rating", { rating: review.rating })} />
      <blockquote className="font-display text-xl leading-snug text-pretty italic">
        “{review.body}”
      </blockquote>
      <figcaption className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">
        {review.authorName}
        {review.branchName && ` · ${review.branchName}`}
      </figcaption>
    </figure>
  );

  return (
    <div className="review-wall" data-paused={paused || undefined}>
      {rows.map((row, r) => (
        <div key={r} className="review-row" data-reverse={r % 2 === 1 || undefined}>
          <div className="review-run">{row.map(card)}</div>
          <div className="review-run" aria-hidden>
            {row.map(card)}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? t("playReviews") : t("pauseReviews")}
        className="review-wall-toggle"
      >
        {paused ? (
          <Play aria-hidden className="size-4" />
        ) : (
          <Pause aria-hidden className="size-4" />
        )}
      </button>
    </div>
  );
}
