import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import en from "@/messages/en.json";

import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const param = await rootParams.locale();
    if (!hasLocale(routing.locales, param)) notFound();
    locale = param;
  }

  return {
    locale,
    messages: await loadMessages(locale as Locale),
    timeZone: "Asia/Colombo",
  };
});

/**
 * English is complete; Sinhala and Tamil may be partial while translations are
 * reviewed. Missing keys fall back to English rather than erroring.
 */
async function loadMessages(locale: Locale): Promise<typeof en> {
  if (locale === "en") return en;
  const localized = (await import(`@/messages/${locale}.json`)).default as DeepPartial<typeof en>;
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
