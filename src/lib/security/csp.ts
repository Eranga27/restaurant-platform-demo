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
  "/events",
  "/login",
  "/pay",
  "/reservations",
  "/signup",
  "/track",
] as const;

/** Pages that post the customer on to the payment gateway. */
export const PAYMENT_FORM_PREFIXES = ["/checkout", "/events", "/pay"] as const;

function matches(pathname: string, prefixes: readonly string[]): boolean {
  const path = pathname.replace(LOCALE_PREFIX, "") || "/";
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function needsStrictCsp(pathname: string): boolean {
  return matches(pathname, STRICT_CSP_PREFIXES);
}

export function postsPaymentForm(pathname: string): boolean {
  return matches(pathname, PAYMENT_FORM_PREFIXES);
}

export type CspOptions = {
  /** Present for strict routes only. */
  nonce?: string;
  isDev: boolean;
  /** Origin of the Supabase project, e.g. `https://abc.supabase.co`. */
  supabaseOrigin?: string;
  /** Extra origins forms may post to: the payment gateway, on checkout and pay pages only. */
  formTargets?: string[];
};

const TURNSTILE = "https://challenges.cloudflare.com";
const IMAGE_HOSTS = [
  "https://images.unsplash.com",
  "https://images.pexels.com",
  "https://tile.openstreetmap.org",
  "https://*.tile.openstreetmap.org",
];

export function buildCsp({ nonce, isDev, supabaseOrigin, formTargets = [] }: CspOptions): string {
  const supabase = supabaseOrigin ?? "https://*.supabase.co";
  // Realtime's websocket: wss:// for the hosted project, ws:// for a local Supabase.
  const supabaseWs = supabase.replace(/^http/, "ws");

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
    "form-action": ["'self'", ...formTargets],
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
