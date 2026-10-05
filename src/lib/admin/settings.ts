import { brandSchema, defaultBrand, type Brand } from "@/config/brand";
import { contrast, TEXT_PAIRS } from "@/lib/color";

/**
 * Brand settings are stored as overrides of the defaults in src/config/brand.ts
 * (docs/DECISIONS.md D54): only what differs is saved, so new defaults in a
 * later release still reach fields an admin never changed.
 */
export function brandOverrides(base: unknown, edited: unknown): unknown {
  if (Array.isArray(edited) || typeof edited !== "object" || edited === null) {
    return JSON.stringify(base) === JSON.stringify(edited) ? undefined : edited;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    const diff = brandOverrides((base as Record<string, unknown> | undefined)?.[key], value);
    if (diff !== undefined) result[key] = diff;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export type SettingsCheck = { ok: true; brand: Brand } | { ok: false; error: string };

/** Validates a full edited brand, including WCAG AA contrast for text colours. */
export function checkBrand(input: unknown): SettingsCheck {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: `Check "${first?.path.join(" → ") ?? "the form"}": ${first?.message ?? "invalid"}`,
    };
  }
  for (const [text, background, label] of TEXT_PAIRS) {
    const ratio = contrast(parsed.data.colors[text], parsed.data.colors[background]);
    if (ratio < 4.5) {
      return {
        ok: false,
        error: `${label} is too hard to read (contrast ${ratio.toFixed(1)}:1, needs 4.5:1).`,
      };
    }
  }
  return { ok: true, brand: parsed.data };
}

export const overridesFor = (brand: Brand) =>
  (brandOverrides(defaultBrand, brand) as Record<string, unknown> | undefined) ?? {};
