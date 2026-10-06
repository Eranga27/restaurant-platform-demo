import {
  DM_Sans,
  Fraunces,
  Geist_Mono,
  Noto_Sans_Sinhala,
  Noto_Sans_Tamil,
} from "next/font/google";

/**
 * Brand typography. Fonts are self-hosted at build time by `next/font`, so a
 * font change is a code change: swap the imports below (see docs/REBRANDING.md).
 * Keep the CSS variable names; the design tokens in globals.css use them.
 */

/**
 * Headlines: a warm, soft serif with italic accent words. Variable weight only:
 * its optical-size axis would double the download for a detail few would see.
 * Not preloaded, so it never competes with the hero; headlines show in a
 * size-matched fallback for a moment.
 */
export const displayFont = Fraunces({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display-latin",
  display: "swap",
  preload: false,
});

/** Body and UI text: a friendly, very readable sans. */
export const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-latin",
  display: "swap",
});

/** Figures in the staff screens: times, order numbers and totals. */
export const monoFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-latin",
  display: "swap",
  preload: false,
});

// Sinhala and Tamil scripts. Not preloaded: only pages in those locales use them,
// and the browser fetches them on demand through unicode-range.
export const sinhalaFont = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  variable: "--font-sinhala",
  display: "swap",
  preload: false,
});

export const tamilFont = Noto_Sans_Tamil({
  subsets: ["tamil"],
  variable: "--font-tamil",
  display: "swap",
  preload: false,
});

export const fontVariables = [displayFont, bodyFont, monoFont, sinhalaFont, tamilFont]
  .map((font) => font.variable)
  .join(" ");
