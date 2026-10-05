import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

/**
 * Sliding-window rate limits backed by Upstash Redis. Without Upstash keys,
 * limits are skipped (docs/DECISIONS.md D9) and a warning is logged once in
 * production.
 */

type LimitName =
  | "checkout"
  | "quote"
  | "payment"
  | "login"
  | "signup"
  | "contact"
  | "booking"
  | "availability"
  | "event"
  | "guest";

const LIMITS: Record<LimitName, { requests: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  checkout: { requests: 5, window: "10 m" },
  quote: { requests: 120, window: "10 m" },
  payment: { requests: 10, window: "10 m" },
  login: { requests: 10, window: "15 m" },
  signup: { requests: 5, window: "1 h" },
  contact: { requests: 5, window: "1 h" },
  booking: { requests: 10, window: "1 h" },
  availability: { requests: 120, window: "10 m" },
  event: { requests: 5, window: "1 h" },
  // Accepting a quote, cancelling a booking: actions on a private link.
  guest: { requests: 20, window: "10 m" },
};

let limiters: Map<LimitName, Ratelimit> | null | undefined;
let warned = false;

function getLimiters(): Map<LimitName, Ratelimit> | null {
  if (limiters !== undefined) return limiters;
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  if (!url || !token) {
    limiters = null;
    return limiters;
  }
  const redis = new Redis({ url, token });
  limiters = new Map(
    (Object.keys(LIMITS) as LimitName[]).map((name) => [
      name,
      new Ratelimit({
        redis,
        prefix: `rl:${name}`,
        limiter: Ratelimit.slidingWindow(LIMITS[name].requests, LIMITS[name].window),
      }),
    ]),
  );
  return limiters;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export async function rateLimit(name: LimitName, key: string): Promise<RateLimitResult> {
  const limiter = getLimiters()?.get(name);
  if (!limiter) {
    if (!warned && env().NODE_ENV === "production") {
      warned = true;
      console.warn(
        "Rate limiting is off: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      );
    }
    return { ok: true };
  }
  try {
    const { success, reset } = await limiter.limit(key);
    return success
      ? { ok: true }
      : { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (error) {
    // Fail open: an outage at the rate limiter must not take ordering down.
    console.error("Rate limiter unavailable", error);
    return { ok: true };
  }
}
