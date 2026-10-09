"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { SPLASH_SEEN_KEY } from "@/lib/splash";

/** Milliseconds after page load to take the splash out of the page, once the page has opened. */
const REMOVE_AFTER = 4500;

const subscribe = () => () => {};

/**
 * The name as words of letters (graphemes, so Sinhala and Tamil vowel signs
 * stay with their letters), numbered in order for the staggered rise.
 */
function letters(name: string): { word: string[]; from: number }[] {
  const segmenter =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  let count = 0;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const chars = segmenter ? [...segmenter.segment(word)].map((s) => s.segment) : [...word];
      const from = count;
      count += chars.length;
      return { word: chars, from };
    });
}

/**
 * The branded splash (see ./splash.tsx), "the first drop": a thread of kithul
 * treacle runs down, swells into a drop and falls into the brand's mark,
 * which blooms as rings ripple out. The name rises letter by letter with a
 * welcome in the three languages, a counter runs to 100, and the page opens
 * through the mark. Its timing is pure CSS (globals.css, .site-splash), so it
 * leaves on its own even before or without JavaScript; this component only
 * takes it out of the page afterwards, and renders nothing after a client
 * navigation.
 */
export function SiteSplash({
  name,
  greeting,
  mark,
}: {
  name: string;
  greeting: string;
  /** The brand's square mark (brand.logo.mark), where the drop lands. */
  mark: string;
}) {
  // True while hydrating the server's HTML, false when mounted by a client
  // navigation; the splash only ever plays on a full page load.
  const hydrating = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
  const [visible, setVisible] = useState(hydrating);

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // Storage blocked: the splash just shows on each full page load.
    }
    // Already seen in this tab: the inline script hid it before it painted.
    const seen = document.documentElement.dataset.splash === "seen";
    const wait = seen ? 0 : Math.max(0, REMOVE_AFTER - performance.now());
    const timer = setTimeout(() => setVisible(false), wait);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="site-splash" aria-hidden>
      <Image className="splash-mark" src={mark} alt="" width={128} height={128} />
      <div className="splash-content">
        <svg className="splash-pour" viewBox="-80 -80 160 160" focusable="false">
          <defs>
            <linearGradient id="splash-treacle" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                style={{ stopColor: "color-mix(in srgb, var(--highlight) 82%, white)" }}
              />
              <stop
                offset="1"
                style={{ stopColor: "color-mix(in srgb, var(--highlight) 88%, var(--primary))" }}
              />
            </linearGradient>
            {/* Blur, then sharpen the edge again: shapes that touch flow into each other like a liquid. */}
            <filter
              id="splash-goo"
              filterUnits="userSpaceOnUse"
              x="-80"
              y="-4000"
              width="160"
              height="4100"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
              <feColorMatrix
                in="blur"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
          <g filter="url(#splash-goo)" fill="url(#splash-treacle)">
            {/* The thread reaches far above the screen; CSS moves it into view. */}
            <rect className="pour-stream" x="-4.5" y="-4000" width="9" height="4000" />
            <g className="pour-fall">
              <circle className="pour-drop" cx="0" cy="22" r="22" />
            </g>
          </g>
          <circle className="pour-ring" r="46" />
          <circle className="pour-ring" r="46" style={{ "--ring": 1 } as React.CSSProperties} />
        </svg>
        <div className="splash-words">
          <p className="splash-name font-display text-5xl lg:text-7xl">
            {letters(name).map(({ word, from }, w) => (
              <span key={w}>
                {w > 0 && " "}
                <span className="word">
                  {word.map((ch, i) => (
                    <span key={i} className="ch" style={{ "--i": from + i } as React.CSSProperties}>
                      {ch}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </p>
          {/* The phone's own Sinhala and Tamil fonts: the site's web fonts for
              those scripts load only on pages in those languages. */}
          <p className="splash-greeting font-system mt-4 text-sm tracking-[0.18em] text-highlight">
            {greeting}
          </p>
        </div>
        <span className="splash-count" />
      </div>
    </div>
  );
}
