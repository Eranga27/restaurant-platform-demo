import type { Metadata } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { publicEnv } from "@/lib/public-env";

type PageMetadata = {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/menu". */
  path: string;
  title: string;
  description?: string;
  /** Use `title` as-is instead of applying the "%s | Brand" template. */
  absoluteTitle?: boolean;
};

/** Per-page metadata with canonical and hreflang alternates for every locale. */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  absoluteTitle,
}: PageMetadata): Metadata {
  const href = (l: Locale) => getPathname({ locale: l, href: path });
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: href(locale),
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, href(l)])),
        "x-default": href(routing.defaultLocale),
      },
    },
    openGraph: {
      title,
      description,
      url: href(locale),
      locale: { en: "en_LK", si: "si_LK", ta: "ta_LK" }[locale],
      type: "website",
    },
  };
}

export const robotsMetadata: Metadata["robots"] = publicEnv.allowIndexing
  ? { index: true, follow: true }
  : { index: false, follow: false };
