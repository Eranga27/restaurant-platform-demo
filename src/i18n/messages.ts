import en from "@/messages/en.json";

import type { Locale } from "./routing";

export type Messages = typeof en;

/**
 * English is complete; Sinhala and Tamil may be partial while translations are
 * reviewed. Missing keys fall back to English rather than erroring.
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return en;
  const localized = (await import(`@/messages/${locale}.json`)).default as DeepPartial<Messages>;
  return deepMerge(en, localized);
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] =
      value && typeof value === "object" && current && typeof current === "object"
        ? deepMerge(current as object, value as object)
        : value;
  }
  return result as T;
}
