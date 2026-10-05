/** WCAG 2.x relative luminance of a #RRGGBB colour. */
export function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Brand colour pairs used as text on a background; each must reach WCAG AA (4.5:1). */
export const TEXT_PAIRS = [
  ["primaryForeground", "primary", "Text on the main colour"],
  ["secondaryForeground", "secondary", "Text on the second colour"],
  ["accentForeground", "accent", "Text on the accent colour"],
  ["foreground", "background", "Body text on the page"],
  ["primary", "background", "Main colour as text (headings, links)"],
] as const;
