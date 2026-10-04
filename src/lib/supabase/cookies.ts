import type { CookieOptions } from "@supabase/ssr";

/**
 * Session cookies are HttpOnly: page JavaScript can't read the tokens, so an
 * XSS bug can't steal a session. The browser asks /api/me who is signed in.
 */
export function hardenCookie(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
