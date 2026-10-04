# Security

How the platform is protected, and the checklist the final review (Phase 8) works through. Items are ticked as each phase delivers them.

## Principles

1. **Assume the public Supabase key is in an attacker's hands.** It ships to every browser. Anyone can call PostgREST, Auth and Realtime directly, bypassing our UI, our proxy and our rate limits. Row Level Security (RLS) must hold on its own.
2. **Customers never write orders, payments or prices directly.** Those writes happen only in Server Actions or Route Handlers using the secret key, after Zod validation and an explicit authorisation check. RLS is the backstop, not the only guard.
3. **The proxy is not an auth boundary.** It sets headers and refreshes sessions. Every protected page, Server Action and Route Handler checks the session and role itself.
4. **The server recalculates every price.** The cart is only item IDs, options and quantities.
5. **A payment is real only when PayHere's server-to-server notification verifies.** The browser's return URL proves nothing.

## Database access (RLS)

Defined in `supabase/migrations/`. Tested on every `npm test` run against an in-memory Postgres (`tests/unit/db/`), and in CI against the real Supabase Postgres image.

- **Deny by default.** Each migration revokes all table privileges from `anon` and `authenticated`, then grants back only what's needed. RLS is enabled on every table; CI fails if any public table has it off.
- **Public catalogue** (branches, menu, options, availability, running promotions, holidays, approved reviews, settings): readable by anyone; inactive rows are hidden.
- **Catalogue writes:** admins only, through `public.is_admin()`. Branch staff and managers can change availability (sold out) for their own branch only, through `public.is_branch_staff()`.
- **Profiles:** users read their own profile and can change only `full_name` and `phone` (column-level grant). Role and branch can't be changed through the API.
- **New users** get a `customer` profile from a trigger. The role is never taken from user-supplied sign-up metadata.
- Role checks are `SECURITY DEFINER` functions with an empty `search_path` that only report on the calling user.

## Orders and sessions (Phase 2)

- **Only the server creates orders.** `public.place_order()` is executable by `service_role` alone. Server Actions call it after Zod validation, a rate limit, a Turnstile check and a full re-price from database rows (`src/lib/orders/quote.ts`). The browser's cart carries IDs, options and quantities, never prices.
- **The database re-checks the money.** Check constraints require the totals to add up, the discount to stay within the subtotal, and each line total to equal unit price × quantity. Delivery orders must have an address.
- **Idempotent.** Each checkout carries a random idempotency key (unique in `orders`); a double-click or retry returns the first order instead of creating a second.
- **Promo codes** aren't readable through the API. Redemptions are counted inside the same transaction as the order, so a code's limit can't be exceeded by racing requests.
- **Reading orders:** customers see only their own (RLS on `user_id`); branch staff see only their branch's; admins see all. Nobody can update an order through the API yet (the dashboard's status changes arrive in Phase 4 through a guarded Server Action).
- **Tracking links** carry a 32-character random token (192 bits) and render with `noindex` and a `no-referrer` referrer policy. The page is server-rendered with the secret key and shows only what the customer needs.
- **Live updates** are a Realtime broadcast on the topic `order:<token>`, sent by a trigger. The payload is the status, payment status and timestamp only, so a listener learns nothing personal even if a token leaked.
- **Sessions:** Supabase Auth cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production. The proxy refreshes them on strict routes; pages and actions still check `getUser()` themselves. Sign-up needs a 10+ character password with upper case, lower case and a digit, and passes Turnstile. Sign-in and sign-up are rate-limited per IP.
- **Rate limits** (Upstash; disabled when it isn't configured): per IP: quotes 120 and checkout 5 per 10 minutes, sign-up 5 per hour; sign-in 10 per 15 minutes per IP and email.

## Headers

Set for every response in `next.config.ts`, with the CSP set per request in `src/proxy.ts`.

| Header                     | Value                                                                                            | Why                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Content-Security-Policy    | See below                                                                                        | Limits where scripts, frames and connections can come from                                           |
| Strict-Transport-Security  | `max-age=63072000; includeSubDomains; preload`                                                   | HTTPS only                                                                                           |
| X-Frame-Options            | `DENY`                                                                                           | Clickjacking (backed by CSP `frame-ancestors 'none'`)                                                |
| X-Content-Type-Options     | `nosniff`                                                                                        | MIME sniffing                                                                                        |
| Referrer-Policy            | `strict-origin-when-cross-origin`                                                                | Order tokens in URLs never leak to other sites                                                       |
| Permissions-Policy         | Camera, microphone, USB, serial, Bluetooth, Topics off; geolocation and payment same-origin only |                                                                                                      |
| Cross-Origin-Opener-Policy | `same-origin`                                                                                    | Isolates the browsing context. Revisit if PayHere's popup needs `same-origin-allow-popups` (Phase 3) |
| X-Powered-By               | Removed                                                                                          |                                                                                                      |

### Content-Security-Policy

Two levels (docs/DECISIONS.md D4, D5):

- **Strict routes** (`/account`, `/admin`, `/checkout`, `/dashboard`, `/login`, `/signup`, `/track`, in any locale): `script-src 'self' 'nonce-…' 'strict-dynamic'`. A fresh nonce per request; Next.js applies it to its own scripts. These pages render dynamically.
- **Public pages** (home, menu, branches, static pages): `script-src 'self' 'unsafe-inline'` so they can be static or ISR. They render no user-supplied content.
- **Both:** `style-src 'self' 'unsafe-inline'` (React style attributes, animation libraries and Leaflet need it); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`; Supabase allowed only for the configured project origin (HTTPS and WSS).

Unit tests in `tests/unit/csp.test.ts` pin these rules. The smoke tests check the headers on a production build.

## OWASP Top 10 (2021) checklist

| Risk                                           | Control                                                                                                                                                      | Status                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| A01 Broken access control                      | RLS on every table, with tests per role; server-side role guard on every dashboard/admin route and action; unguessable order tokens                          | Catalogue and order RLS + tests done (Phases 1, 2); staff routes planned (4, 6) |
| A02 Cryptographic failures                     | HTTPS only (HSTS); secrets only in env vars; no card data ever touches our servers (PayHere hosted page)                                                     | Headers done (Phase 0)                                                          |
| A03 Injection                                  | Zod validation on every server input; parameterised queries via supabase-js; no `dangerouslySetInnerHTML` (ESLint `react/no-danger`); CSP                    | Lint rule and CSP done (Phase 0)                                                |
| A04 Insecure design                            | Server-side pricing; idempotency keys on orders; webhook-only payment confirmation; documented decisions                                                     | Pricing, idempotency done (Phase 2); payments planned (Phase 3)                 |
| A05 Security misconfiguration                  | Security headers; `poweredByHeader: false`; env validation; storage bucket policies                                                                          | Headers done (Phase 0)                                                          |
| A06 Vulnerable components                      | Dependabot; `npm audit` (production deps) in CI; CodeQL                                                                                                      | Done (Phase 0)                                                                  |
| A07 Identification and authentication failures | Supabase Auth with secure cookies; TOTP MFA for admins and managers; rate limits and backoff on login                                                        | Cookies, passwords, rate limits done (Phase 2); MFA planned (Phases 4, 6)       |
| A08 Software and data integrity failures       | PayHere `md5sig` verification and amount/currency check; lockfile + `npm ci`; branch protection with required CI                                             | CI done (Phase 0); PayHere planned (Phase 3)                                    |
| A09 Logging and monitoring failures            | Audit log of staff/admin actions; raw payment payloads stored                                                                                                | Planned (Phases 3, 6)                                                           |
| A10 Server-side request forgery                | No user-supplied URLs are fetched server-side; image hosts allow-listed in `next.config.ts`; promotion links limited to internal paths by a check constraint | Done (Phases 0, 1)                                                              |

## Known dev-only advisories

`npm audit` reports a high-severity issue in `braces`, pulled in by ESLint's tooling (`eslint-config-next` → `fast-glob`). It runs only on developer machines and CI, never in the deployed app, and has no upstream fix yet. CI audits production dependencies only (`npm audit --omit=dev`).

## Reporting

This is a demo. Report issues privately to the repository owner rather than opening a public issue.
