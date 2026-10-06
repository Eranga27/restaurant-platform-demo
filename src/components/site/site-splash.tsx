"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { SPLASH_SEEN_KEY } from "@/lib/splash";

/** Milliseconds after page load to take the splash out of the page, once the hero's entrance is over. */
const REMOVE_AFTER = 4500;

const subscribe = () => () => {};

/** The lamp's outline, drawn in order: rim, bowl, stem, foot. */
const LAMP_LINES = [
  "M26 70h68",
  "M30 70c4 15 15 22 30 22s26-7 30-22",
  "M55 92v14M65 92v14",
  "M44 106h32l7 11H37Z",
];

/**
 * The branded splash (see ./splash.tsx): a magul pahana, the oil lamp lit to
 * open anything auspicious, drawn in saffron on lacquer red. Its flame lights,
 * the name and a welcome in the three languages rise, and the flame's glow
 * opens out into the page. Its timing is pure CSS (globals.css, .site-splash), so it
 * leaves on its own even before or without JavaScript; this component only
 * takes it out of the page afterwards, and renders nothing after a client
 * navigation.
 */
export function SiteSplash({ name, greeting }: { name: string; greeting: string }) {
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
      <div className="splash-content flex flex-col items-center gap-6 px-6 text-center">
        <svg viewBox="0 0 120 124" className="size-36 overflow-visible lg:size-44">
          <defs>
            <radialGradient id="splash-glow">
              <stop offset="0" stopColor="var(--highlight)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--highlight)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="splash-flame" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="var(--highlight)" />
              <stop offset="1" stopColor="var(--primary-foreground)" />
            </linearGradient>
          </defs>
          <circle className="lamp-glow" cx="60" cy="48" r="44" fill="url(#splash-glow)" />
          <path
            className="lamp-flame"
            d="M60 24c7 11 11 20 7.5 29a8 8 0 0 1-15 0C49 44 53 35 60 24Z"
            fill="url(#splash-flame)"
          />
          <g
            fill="none"
            stroke="var(--highlight)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M60 62v8" />
            {LAMP_LINES.map((d, i) => (
              <path
                key={d}
                className="lamp-line"
                pathLength={1}
                style={{ "--i": i } as React.CSSProperties}
                d={d}
              />
            ))}
          </g>
        </svg>
        <div className="space-y-4">
          <p className="splash-name font-display text-5xl lg:text-7xl">{name}</p>
          {/* The phone's own Sinhala and Tamil fonts: the site's web fonts for
              those scripts load only on pages in those languages. */}
          <p className="splash-greeting font-system text-sm tracking-[0.18em] text-highlight">
            {greeting}
          </p>
          <span className="splash-line" />
        </div>
      </div>
    </div>
  );
}
