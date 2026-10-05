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
- **Rate limits** (Upstash; disabled when it isn't configured): per IP: quotes 120 and checkout 5 and payment starts 10 per 10 minutes, sign-up 5 per hour; sign-in 10 per 15 minutes per IP and email.

## Payments (Phase 3)

- **Only PayHere's signed notification marks an order paid.** `POST /api/payments/payhere/notify` accepts form posts up to 8 KB, checks the merchant ID, then compares the `md5sig` in constant time. Forged or malformed notifications get 400/401 and never reach the database. Returning to the site after paying changes nothing: the page waits for the notification.
- **The database re-checks the money.** `apply_payhere_notification()` (secret key only) locks the payment, compares amount and currency with the stored attempt, ignores repeats and out-of-order notifications (a late "failed" can't undo "paid"), and updates the payment and the order in one transaction. Payments for cancelled orders and amount mismatches are recorded and flagged, never applied silently.
- **The browser can't set the price.** The checkout form is built and signed on the server from the stored order total. The merchant secret never leaves the server; only the resulting hash is sent.
- **Card data never touches our servers.** Customers enter card or wallet details on PayHere's page. Card fields in notifications are dropped before storing.
- **Starting a payment** needs the order's tracking token, is rate limited (10 per 10 minutes per IP) and is capped at 10 attempts per order.
- **Payment records** (`payments`, `payment_notifications`) are readable by admins only. Customers see payment status through their order.
- **CSP:** `form-action` allows the PayHere checkout origin (sandbox or live, whichever is configured) on `/checkout` and `/pay` only.

## Branch dashboard (Phase 4)

- **Server-side checks everywhere.** Each dashboard page and Server Action checks the session, the staff role and the branch. The database checks again: `update_order_status()`, `set_item_availability()` and `set_branch_accepting_orders()` are `SECURITY DEFINER` functions that only act for the caller's own branch (admins: any branch).
- **Orders move only forwards**, one allowed step at a time per order type. Rejecting or cancelling needs a reason, and every change is recorded with the staff member's ID.
- **Prices stay with admins.** Staff can no longer write `branch_menu_overrides` directly.
- **Live board** topics are named by a random per-branch key kept in `branch_secrets`, which no API role can read. Payloads carry IDs and statuses only.
- **Push subscriptions** belong to their owner (RLS), only staff can add them, and their endpoints must be a known browser push service: the server posts to them (OWASP A10).
- **Alerts** (push, Telegram) contain no customer details.
- **Print tickets** are dashboard pages behind the same checks.

## Bookings and events (Phase 5)

- **Only the server writes bookings and enquiries.** `book_table()`, `create_event_inquiry()`, `respond_to_quote()`, `cancel_reservation_by_guest()` and `start_deposit_payment()` are secret-key only, called after Zod validation, a rate limit and (for new ones) Turnstile.
- **Capacity is enforced by the database** under a per-branch lock, so the last seats can't be double-booked.
- **Availability reveals nothing personal:** the booking form only learns whether each time is free or full.
- **Private links** (32-character random tokens) for bookings and enquiries; booking pages send no referrer. The enquiry page keeps the default policy because PayHere checks the Referer for deposits (origin only, cross-site).
- **Staff changes go through functions** that check the branch and role: staff seat, finish, mark no-shows and cancel bookings (with a reason); only managers of the branch and admins quote, decline, confirm or close events.
- **Deposits** are verified exactly like order payments (signature, amount, currency, out-of-order handling); a deposit paid for a closed enquiry is flagged for a refund.
- **RLS:** guests read their own bookings and enquiries (when signed in), branch staff their branch's, admins all. No API role can write them.
- **Rate limits:** availability 120 per 10 minutes, bookings 10 per hour, enquiries 5 per hour, link actions (cancel, accept, decline) 20 per 10 minutes, per IP.

## Admin panel (Phase 6)

- **Two-step sign-in (TOTP) for managers and admins,** enforced by the database (`aal2` in the role functions) as well as the app. A password alone gives a manager or admin no more than a customer.
- **Every admin page and action checks** for an admin with MFA in this session; writes then run as that admin, so RLS applies again.
- **Audit log** of catalogue, branch, holiday, promo code, settings, role, booking, enquiry and refund changes, with the actor and (when made through the site) the IP. Personal details are kept out (changed fields only). Admins can read it; nobody can edit it through the API.
- **Staff management:** roles change only through `set_staff_role()` (admins with MFA; never their own role). Resetting someone's MFA is logged.
- **Uploads:** type checked from the file's bytes, 3 MB maximum, random file names, public read-only bucket written only by the server.
- **CSV export** is admin-only, capped at 5,000 rows, and escapes cells a spreadsheet would run as formulas (CSV injection).
- **Settings** are validated in full, including colour contrast, before saving.

## Customer accounts (Phase 7)

- **Account pages** (`/account`) check the session on the server and read only through the customer's own session, so RLS returns only their orders, bookings, points and addresses. They're never indexed.
- **Saved addresses:** customers read and change only their own (RLS on every operation), up to 10 each.
- **Loyalty points:** an append-only ledger nobody can write through the API. Points are spent inside `place_order()` under a per-customer lock with a balance check, so two orders at once can't spend the same points; earning and returning happen in a database trigger, at most once per order. The quote caps how many points an order can use, and the database checks the totals add up.
- **Reorder** reads the past order through the customer's session (RLS) and rebuilds the cart from today's menu; checkout re-prices it on the server like any other cart.
- **Reviews:** submitted only by the server (`submit_review()`, secret key) from a completed order's private tracking link, rate limited (20 per 10 minutes per IP), one per order. Nothing shows until an admin with two-step sign-in approves it; moderation is audited. The public API returns only what the site shows (column privileges), never the author's account ID.
- **Service worker:** network-first for pages, with an offline page as the only cached content, so it can't serve stale prices or someone else's page. The offline page has no scripts and its own `default-src 'none'` CSP.
- **Translations** go through a checker and a unit test that reject a missing or changed placeholder or tag, so a translation can't break a page or add a link.

## Hardening review (Phase 9, v1.0.0)

Every item in docs/PLAN.md §7 was checked against the code on 2026-10-05:

- **Access control:** every Server Action checks the session or role before acting and validates its input with Zod; every public one is rate limited, and the ones that create something also check Turnstile. Staff and admin pages check the role on the server.
- **Database guard tests** (`tests/unit/db/schema-guards.test.ts`) pin, for the whole schema: RLS on every table; the tables and columns the public and signed-in API roles can touch; the functions they can call; and a fixed `search_path` on every privileged function. A migration that loosens any of these fails CI until the lists are updated on purpose.
- **Sign-in backoff:** 10 attempts per 15 minutes per IP and account, and 30 an hour per account from any IP, so a password can't be guessed from many addresses (on top of Supabase Auth's own limits).
- **Rate-limit keys are hashed** (SHA-256) before they reach Upstash, so it stores no email or IP addresses.
- **No secrets in the browser:** the client bundle carries only the public Supabase URL and publishable key. An unused `CRON_SECRET` setting was removed.
- **Dependencies:** `npm audit --omit=dev` finds no vulnerabilities (see dev-only advisories below).
- **Accessibility:** axe checks WCAG 2.2 AA on the main pages and dialogs in CI, at phone and desktop sizes; no violations.

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
- **Public pages** (home, menu, branches, static pages): `script-src 'self' 'unsafe-inline'` so they can be static or ISR. They render no user-supplied content. Their only inline script of our own is the splash screen's fixed one-line `sessionStorage` check (D63); strict pages never show the splash.
- **Offline pages** (`/offline/<locale>.html`, shown by the service worker): `default-src 'none'; style-src 'unsafe-inline'`, set by the route itself.
- **Both:** `style-src 'self' 'unsafe-inline'` (React style attributes, animation libraries and Leaflet need it); `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`; Supabase allowed only for the configured project origin (HTTPS and WSS).

Unit tests in `tests/unit/csp.test.ts` pin these rules. The smoke tests check the headers on a production build.

## OWASP Top 10 (2021) checklist

| Risk                                           | Control                                                                                                                                                                                                                    | Status                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A01 Broken access control                      | RLS on every table, with tests per role; server-side role guard on every dashboard/admin route and action; unguessable order tokens                                                                                        | Done; schema-wide guard tests (Phase 9)                                              |
| A02 Cryptographic failures                     | HTTPS only (HSTS); secrets only in env vars; no card data ever touches our servers (PayHere hosted page)                                                                                                                   | Headers done (Phase 0)                                                               |
| A03 Injection                                  | Zod validation on every server input; parameterised queries via supabase-js; no `dangerouslySetInnerHTML` (ESLint `react/no-danger`); CSP                                                                                  | Lint rule and CSP done (Phase 0)                                                     |
| A04 Insecure design                            | Server-side pricing; idempotency keys on orders; webhook-only payment confirmation; documented decisions                                                                                                                   | Pricing and idempotency (Phase 2), webhook-only payment confirmation (Phase 3) done  |
| A05 Security misconfiguration                  | Security headers; `poweredByHeader: false`; env validation; storage bucket policies                                                                                                                                        | Headers done (Phase 0)                                                               |
| A06 Vulnerable components                      | Dependabot; `npm audit` (production deps) in CI; CodeQL                                                                                                                                                                    | Done (Phase 0)                                                                       |
| A07 Identification and authentication failures | Supabase Auth with secure cookies; TOTP MFA for admins and managers; rate limits and backoff on login                                                                                                                      | Done; per-account sign-in backoff (Phase 9)                                          |
| A08 Software and data integrity failures       | PayHere `md5sig` verification and amount/currency check; lockfile + `npm ci`; branch protection with required CI                                                                                                           | CI (Phase 0), PayHere signature, amount and currency checks (Phase 3) done           |
| A09 Logging and monitoring failures            | Audit log of staff/admin actions; raw payment payloads stored                                                                                                                                                              | Payment notifications (Phase 3), audit log of staff and admin actions (Phase 6) done |
| A10 Server-side request forgery                | No user-supplied URLs are fetched server-side, except push endpoints limited to the browsers' push services; image hosts allow-listed in `next.config.ts`; promotion links limited to internal paths by a check constraint | Done (Phases 0, 1)                                                                   |

## Known dev-only advisories

`npm audit` reports a high-severity issue in `braces` (deeply nested glob patterns), pulled in by developer tooling: ESLint's Next.js config and the shadcn command-line tool, through `fast-glob`. It runs only on developer machines and CI with our own patterns, never in the deployed app, and has no non-breaking fix yet. CI audits production dependencies only (`npm audit --omit=dev`), which report none.

## Reporting

This is a demo. Report issues privately to the repository owner rather than opening a public issue.
