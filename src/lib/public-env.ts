/**
 * Public environment, safe for the browser. Each variable is referenced by its
 * full literal name because Next.js only inlines `process.env.NEXT_PUBLIC_*`
 * when written out exactly.
 */

/** Cloudflare's published test site key: always passes, never shows a challenge. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export const publicEnv = {
  siteUrl: stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  /** On unless explicitly "false", so a fresh deployment is clearly marked as a demo. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  /** Off by default: a fictional restaurant should not appear in search results. */
  allowIndexing: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined,
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
} as const;

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}
