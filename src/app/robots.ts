import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/public-env";

/**
 * Demo deployments ask crawlers to stay away (the restaurant is fictional).
 * Set NEXT_PUBLIC_ALLOW_INDEXING=true for a real launch.
 */
export default function robots(): MetadataRoute.Robots {
  if (!publicEnv.allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/dashboard", "/checkout", "/account", "/track", "/styleguide"],
    },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  };
}
