"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { SPLASH_SEEN_KEY } from "@/lib/splash";

/** Milliseconds after page load to take the splash out of the page, once the hero's entrance is over. */
const REMOVE_AFTER = 3000;

const subscribe = () => () => {};

const OUTER = Array.from({ length: 8 }, (_, i) => i * 45);
const INNER = OUTER.map((angle) => angle + 22.5);

/**
 * The branded splash (see ./splash.tsx): the brand mark opens like a lotus
 * (the nil manel, Sri Lanka's national flower), with a welcome in the three
 * languages. Its timing is pure CSS (globals.css, .site-splash), so it fades
 * on its own even before or without JavaScript; this component only takes it
 * out of the page afterwards, and renders nothing after a client navigation.
 */
export function SiteSplash({
  name,
  mark,
  greeting,
}: {
  name: string;
  mark: string;
  greeting: string;
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
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative size-36 lg:size-48">
          <svg viewBox="0 0 120 120" className="absolute inset-0 size-full">
            {OUTER.map((angle, i) => (
              <g key={angle} transform={`rotate(${angle} 60 60)`}>
                <path
                  className="petal"
                  style={{ "--i": i } as React.CSSProperties}
                  d="M60 60C51 46 51 23 60 6c9 17 9 40 0 54Z"
                  fill={i % 2 ? "var(--highlight)" : "var(--primary)"}
                  opacity={i % 2 ? 0.9 : 0.82}
                />
              </g>
            ))}
            {INNER.map((angle, i) => (
              <g key={angle} transform={`rotate(${angle} 60 60)`}>
                <path
                  className="petal"
                  style={{ "--i": i + 4 } as React.CSSProperties}
                  d="M60 60c-5-9-5-22 0-32 5 10 5 23 0 32Z"
                  fill="var(--secondary)"
                  opacity={0.75}
                />
              </g>
            ))}
          </svg>
          <div className="mark absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-background shadow-soft lg:size-18">
            <Image
              src={mark}
              alt=""
              width={56}
              height={56}
              priority
              className="size-11 lg:size-14"
            />
          </div>
        </div>
        <div className="words space-y-2">
          <p className="font-display text-4xl text-primary lg:text-6xl">{name}</p>
          {/* The phone's own Sinhala and Tamil fonts: the site's web fonts for
              those scripts load only on pages in those languages. */}
          <p className="font-system text-sm tracking-[0.18em] text-muted-foreground">{greeting}</p>
        </div>
      </div>
    </div>
  );
}
