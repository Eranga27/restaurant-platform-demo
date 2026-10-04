import "server-only";

import { env } from "@/lib/env";

/** Cloudflare's published test secret: every token passes. Used when no key is set (D9). */
const TEST_SECRET = "1x0000000000000000000000000000000AA";

/** Verifies a Cloudflare Turnstile token on the server. */
export async function verifyTurnstile(
  token: string | null,
  remoteIp: string | null,
): Promise<boolean> {
  if (!token) return false;
  const secret = env().TURNSTILE_SECRET_KEY ?? TEST_SECRET;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
