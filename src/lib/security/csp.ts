/**
 * Content-Security-Policy builder. See docs/DECISIONS.md (D4, D5).
 *
 * - "strict" routes get a per-request nonce + 'strict-dynamic'. Those pages
 *   must render dynamically, which they do anyway because they read the session.
 * - Everything else gets a nonce-free policy so it can stay static / ISR.
 */

const LOCALE_PREFIX = /^\/(en|si|ta)(?=\/|$)/;

/** Path prefixes (after any locale prefix) that handle accounts, orders or staff data. */
export const STRICT_CSP_PREFIXES = [
  "/account",
  "/admin",
  "/checkout",
  "/dashboard",
  "/login",
  "/signup",
  "/track",
] as const;

export function needsStrictCsp(pathname: string): boolean {
  const path = pathname.replace(LOCALE_PREFIX, "") || "/";
  return STRICT_CSP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export type CspOptions = {
  /** Present for strict routes only. */
  nonce?: string;
  isDev: boolean;
  /** Origin of the Supabase project, e.g. `https://abc.supabase.co`. */
  supabaseOrigin?: string;
};

const TURNSTILE = "https://challenges.cloudflare.com";
const IMAGE_HOSTS = [
  "https://images.unsplash.com",
  "https://images.pexels.com",
  "https://tile.openstreetmap.org",
  "https://*.tile.openstreetmap.org",
];

export function buildCsp({ nonce, isDev, supabaseOrigin }: CspOptions): string {
  const supabase = supabaseOrigin ?? "https://*.supabase.co";
  const supabaseWs = supabase.replace(/^https:/, "wss:");

  const scriptSrc = nonce
    ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"]
    : ["'self'", "'unsafe-inline'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");
  scriptSrc.push(TURNSTILE);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", supabase, ...IMAGE_HOSTS],
    "font-src": ["'self'"],
    "media-src": ["'self'", supabase],
    "connect-src": ["'self'", supabase, supabaseWs],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
