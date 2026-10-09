"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

import { SPLASH_SEEN_KEY } from "@/lib/splash";

/** Milliseconds after page load to take the splash out of the page, once the page has opened. */
const REMOVE_AFTER = 4500;

/** When the first dish word lands, and the beat between chops (ms). Kept in step with globals.css. */
const FIRST_AT = 220;
const BEAT = 420;
/** A slight lean for each word, like letters stamped by hand. */
const TILT = ["-3deg", "2deg", "-1.5deg", "2.5deg", "-2deg"];
/** The panel falls apart in this many strips. */
const STRIPS = 7;

const subscribe = () => () => {};

/**
 * The branded splash (see ./splash.tsx), "kottu chop": to the beat of the
 * kottu griddle, the names of a few dishes land on lacquer red and are cut
 * in two by a saffron blade, one after another, while a counter runs to 100.
 * The brand's name lands last; then the panel falls apart in strips, red over
 * saffron, half of them dropping and half rising, and the page shows through.
 * Its timing is pure CSS (globals.css, .site-splash), so it leaves on its own
 * even before or without JavaScript; this component only takes it out of the
 * page afterwards, and renders nothing after a client navigation.
 */
export function SiteSplash({
  name,
  greeting,
  mark,
  words,
}: {
  name: string;
  greeting: string;
  /** The brand's square mark (brand.logo.mark), in the corner. */
  mark: string;
  /** Dish names chopped one after another before the brand's name (Splash.words). */
  words: string[];
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
  const strips = Array.from({ length: STRIPS }, (_, s) => (
    <i key={s} style={{ "--s": s } as React.CSSProperties} />
  ));
  return (
    <div className="site-splash" aria-hidden>
      <div className="chop-strips chop-under">{strips}</div>
      <div className="chop-strips chop-over">{strips}</div>
      <div className="chop-stage">
        <Image className="chop-mark" src={mark} alt="" width={64} height={64} />
        <div className="chop-words font-poster">
          {words.slice(0, 5).map((word, i) => {
            const style = {
              "--at": `${FIRST_AT + i * BEAT}ms`,
              "--r": TILT[i % TILT.length],
            } as React.CSSProperties;
            return (
              <span key={word} className="chop-word chop-cut" style={style}>
                <span className="chop-half chop-top">{word}</span>
                <span className="chop-half chop-bottom">{word}</span>
                <i className="chop-blade" />
              </span>
            );
          })}
          <span
            className="chop-word chop-name"
            style={
              { "--at": `${FIRST_AT + Math.min(words.length, 5) * BEAT}ms` } as React.CSSProperties
            }
          >
            <span className="chop-half">{name}</span>
          </span>
        </div>
        {/* The phone's own Sinhala and Tamil fonts: the site's web fonts for
            those scripts load only on pages in those languages. */}
        <p className="chop-greeting font-system">{greeting}</p>
        <span className="chop-count font-poster" />
      </div>
    </div>
  );
}
