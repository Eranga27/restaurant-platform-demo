import "server-only";

import { cache, type CSSProperties } from "react";

import { brandSchema, defaultBrand, type Brand } from "@/config/brand";

import { getPublicRows } from "./source";

/**
 * The brand in effect: the `settings.brand` overrides (edited in Admin →
 * Settings) merged over the defaults in src/config/brand.ts. An invalid
 * override is ignored with a warning rather than breaking the site.
 */
export const getBrand = cache(async (): Promise<Brand> => {
  const { brandOverrides } = await getPublicRows();
  if (Object.keys(brandOverrides).length === 0) return defaultBrand;

  const merged = brandSchema.safeParse(deepMerge(defaultBrand, brandOverrides));
  if (!merged.success) {
    console.warn("Ignoring invalid brand settings:", merged.error.issues);
    return defaultBrand;
  }
  return merged.data;
});

/** CSS variables for brand colours that differ from the stylesheet defaults. */
export function brandColorVariables(brand: Brand): CSSProperties | undefined {
  const map: [keyof Brand["colors"], string][] = [
    ["primary", "--primary"],
    ["primaryForeground", "--primary-foreground"],
    ["secondary", "--secondary"],
    ["secondaryForeground", "--secondary-foreground"],
    ["accent", "--highlight"],
    ["accentForeground", "--highlight-foreground"],
    ["background", "--background"],
    ["foreground", "--foreground"],
  ];
  const style: Record<string, string> = {};
  for (const [key, variable] of map) {
    if (brand.colors[key] !== defaultBrand.colors[key]) style[variable] = brand.colors[key];
  }
  return Object.keys(style).length > 0 ? (style as CSSProperties) : undefined;
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override))
    return override === undefined ? base : override;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) result[key] = deepMerge(base[key], value);
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
