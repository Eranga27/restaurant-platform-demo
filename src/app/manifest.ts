import type { MetadataRoute } from "next";

import { getBrand } from "@/lib/data/brand";

/**
 * Web app manifest: lets customers add the site to their home screen and open
 * it like an app. Names and colours come from the brand settings.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getBrand();
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: brand.colors.background,
    theme_color: brand.colors.primary,
    lang: "en",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Menu", url: "/menu" },
      { name: "Book a table", url: "/reservations" },
      { name: "My account", url: "/account" },
    ],
  };
}
