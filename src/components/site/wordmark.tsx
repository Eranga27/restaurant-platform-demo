"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const HEIGHT = 150;
const BASELINE = 122;
const FONT_SIZE = 170;

/**
 * The brand name set edge to edge, e.g. across the bottom of the footer. An SVG
 * whose width is measured from the real text once the font has loaded, so any
 * name fits the width exactly without stretching. Decorative: the name is
 * said elsewhere on the page.
 */
export function Wordmark({
  text,
  poster = false,
  className,
}: {
  text: string;
  /** Set in the poster face, condensed and in capitals, instead of the serif. */
  poster?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGTextElement>(null);
  // A first guess (about 0.42 of the size per character), refined after load.
  const [width, setWidth] = useState(() => Math.round(text.length * FONT_SIZE * 0.42));

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const box = ref.current?.getBBox();
      if (!cancelled && box && box.width > 0) setWidth(Math.ceil(box.x + box.width + 2));
    };
    measure();
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className={cn("block h-auto w-full", className)}
    >
      <text
        ref={ref}
        x="0"
        y={BASELINE}
        fill="currentColor"
        style={
          poster
            ? {
                fontFamily: "var(--font-poster)",
                fontSize: FONT_SIZE,
                fontWeight: 800,
                fontStretch: "75%",
                letterSpacing: "-0.005em",
              }
            : { fontFamily: "var(--font-display)", fontSize: FONT_SIZE, letterSpacing: "-0.02em" }
        }
      >
        {poster ? text.toLocaleUpperCase() : text}
      </text>
    </svg>
  );
}
