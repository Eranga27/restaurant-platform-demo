import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { publicEnv } from "@/lib/public-env";

/** Public pages, each with alternates in every language. */
const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] =
  [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/menu", priority: 0.9, changeFrequency: "daily" },
    { path: "/branches", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.4, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.2, changeFrequency: "monthly" },
    { path: "/refunds", priority: 0.2, changeFrequency: "monthly" },
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (locale: (typeof routing.locales)[number], path: string) =>
    `${publicEnv.siteUrl}${getPathname({ locale, href: path })}`;

  return PAGES.map(({ path, priority, changeFrequency }) => ({
    url: url(routing.defaultLocale, path),
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((locale) => [locale, url(locale, path)])),
    },
  }));
}
