import "server-only";

import { headers } from "next/headers";

/**
 * The caller's IP for rate limiting and bot checks. On Vercel the first entry
 * of x-forwarded-for is set by the platform; elsewhere it's best effort.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || null;
}
