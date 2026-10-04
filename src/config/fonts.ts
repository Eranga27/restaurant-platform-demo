import { DM_Sans, Fraunces, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";

/**
 * Brand typography. Fonts are self-hosted at build time by `next/font`, so a
 * font change is a code change: swap the imports below (see docs/REBRANDING.md).
 * Keep the CSS variable names; the design tokens in globals.css use them.
 */

/** Headings: a warm, soft serif. */
export const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-latin",
  axes: ["SOFT", "opsz"],
  display: "swap",
});

/** Body and UI text. */
export const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-latin",
  display: "swap",
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

export const fontVariables = [displayFont, bodyFont, sinhalaFont, tamilFont]
  .map((font) => font.variable)
  .join(" ");
