import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "si", "ta"],
  defaultLocale: "en",
  // English URLs stay clean (/menu); Sinhala and Tamil are prefixed (/si/menu).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

/** Native names for the language menu. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  si: "සිංහල",
  ta: "தமிழ்",
};

/** Short labels for the compact switcher button. */
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  si: "සිං",
  ta: "தமி",
};
