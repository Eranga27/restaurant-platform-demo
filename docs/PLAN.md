# Sri Lankan Restaurant Platform: Demo Build Plan

> **For Claude Code:** This is the master plan. Save it in the repo as `docs/PLAN.md`. Work phase by phase, commit often with conventional commits, and open a PR per phase so Vercel creates a preview deployment. Do not use any paid service. Ask before adding any dependency that needs an account or API key.

---

## 1. Goal

Build a showcase-quality restaurant website and ordering platform for a **fictional Sri Lankan restaurant chain**. It is a sales demo that web developer can show restaurant owners. It must look premium, work end to end (order → branch → payment → status updates), be secure, and be **easy to rebrand** for each new prospect.

**Success criteria**
- A visitor can browse the menu, customise dishes, order for delivery or pickup, pay (sandbox), and track the order live.
- The selected branch sees the order appear instantly on its dashboard with a sound alert.
- Visitors can reserve a table or request an event or catering booking.
- An admin can manage menus, branches, prices, availability and promotions without touching code.
- Lighthouse scores of 90+ on Performance, Accessibility, Best Practices and SEO on mobile.
- Everything runs on free tiers.

---

## 2. Tech Stack (all free)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** | SSR/SSG for SEO, Server Actions, Route Handlers |
| Styling | **Tailwind CSS + shadcn/ui** | Fast, consistent, accessible components |
| Animation | **Framer Motion** (UI) + **GSAP** (hero/scroll moments only) | Premium feel without hurting performance |
| Database / Auth / Realtime / Storage | **Supabase (free tier)** | Postgres + Row Level Security, auth with MFA, realtime order feed, image storage |
| Validation | **Zod** | Shared schemas on client and server |
| Forms | **React Hook Form** | |
| State (cart) | **Zustand** (persisted to localStorage, re-validated on server) | |
| i18n | **next-intl** | English, Sinhala, Tamil |
| Maps | **Leaflet + OpenStreetMap** (react-leaflet) | Free, no Google Maps billing |
| Payments | **PayHere Sandbox** + Cash on Delivery | PayHere is the standard Sri Lankan gateway; Stripe does not onboard Sri Lankan merchants |
| Email | **Resend (free tier)** + React Email templates | Order and booking confirmations |
| Branch alerts | Realtime dashboard + **Web Push** + optional **Telegram bot** | All free (WhatsApp/SMS APIs are paid, so leave as "upgrade options") |
| Rate limiting | **Upstash Redis (free tier)** + `@upstash/ratelimit` | |
| Bot protection | **Cloudflare Turnstile** | Free CAPTCHA alternative |
| Testing | **Vitest** (unit) + **Playwright** (E2E) | |
| CI | **GitHub Actions** | Lint, typecheck, test, build on every PR |
| Hosting | **Vercel Hobby** | Preview deployments per PR |
| Analytics | **Vercel Web Analytics (free)** or Umami self-host later | |

**Free-tier caveats to keep in mind (tell the client honestly):**
- Supabase free projects pause after about a week of no activity. Add a GitHub Actions cron that pings the DB daily during the demo period.
- Vercel Hobby is for non-commercial use. Fine for the demo; a real client launch should move to Vercel Pro, Netlify, or a self-hosted option.
- PayHere sandbox is free. Live payments always carry a per-transaction fee paid by the restaurant; there is no free live payment gateway anywhere.

---

## 3. White-Label Architecture (most important for sales)

All branding lives in one config + DB table so the demo can be re-skinned for each prospect in minutes.

`src/config/brand.ts` (defaults) overridden by a `settings` table:
- Restaurant name, tagline, logo, favicon
- Colour tokens (primary, accent, background), font pairing
- Contact details, social links, opening hours
- Feature flags: `delivery`, `pickup`, `dineIn`, `reservations`, `events`, `loyalty`, `alcohol`
- Tax and charges: service charge %, VAT %, delivery fee rules

Demo restaurant (placeholder, fictional): **"Kithul & Co. — Sri Lankan Kitchen"** with 3 branches: Colombo 07, Nugegoda, Kandy.

Add a visible but tasteful **"Demo site"** ribbon (toggle via env var) and a `/demo` page with test logins and PayHere sandbox test card details.

---

## 4. Sri Lankan Standards & Localisation

- **Currency:** LKR, formatted `Rs. 1,250.00`. Store all money as **integer cents** in the DB.
- **Charges:** 10% service charge (common in SL restaurants, configurable) and VAT (configurable; verify the current rate before going live). Show a clear bill breakdown.
- **Languages:** English (default), සිංහල, தமிழ். Use Noto Sans Sinhala / Noto Sans Tamil. Language switcher in header. Menu items have translatable name and description fields.
- **Phone numbers:** validate `+94 7X XXX XXXX` and local `07X XXX XXXX`; normalise to E.164.
- **Addresses:** district → city dropdowns (all 25 districts), plus free-text address, landmark field (very common in SL), and map pin.
- **Menu content:** rice & curry, kottu (chicken, cheese, dolphin), lamprais, hoppers and egg hoppers, string hoppers, pittu, devilled dishes, fried rice, biriyani, seafood, short eats, wattalappan, faluda, king coconut, Ceylon tea. Mark vegetarian, vegan, halal, contains nuts.
- **Spice level selector** on relevant dishes (Mild / Medium / Sri Lankan Hot).
- **Calendar awareness:** Poya day banner (and auto-disable alcohol items if the `alcohol` flag is on), Avurudu, Vesak, Christmas seasonal promo slots.
- **Payment habits:** Cash on Delivery is essential; card and digital wallets via PayHere.
- **Design feel:** warm, earthy, modern. Think spice tones, kithul/jaggery browns, leaf greens, subtle batik or lotus line patterns. Real food photography feel, not clipart. Use royalty-free images (Unsplash/Pexels) with credits in `docs/CREDITS.md`.

---

## 5. Features

### 5.1 Customer site
1. **Home:** cinematic hero (video or image loop), signature dishes, current offers, branch finder, reviews, "Order now" and "Book a table" CTAs.
2. **Menu:** category tabs with sticky nav, search, dietary filters, item cards with image, price, badges. "Sold out" state per branch.
3. **Item detail sheet:** portion size, add-ons, spice level, special instructions, quantity.
4. **Cart:** slide-out drawer, live totals, promo code field, minimum order warning.
5. **Checkout:**
   - Order type: Delivery / Pickup / Dine-in (table QR, future)
   - Branch: auto-suggest nearest branch from the pin; block if outside delivery radius
   - ASAP or scheduled time (within branch opening hours)
   - Guest checkout allowed (phone + email), or log in
   - Payment: PayHere or Cash on Delivery
6. **Order tracking page:** live status timeline (Received → Accepted → Preparing → Ready / Out for delivery → Completed) via Supabase Realtime. Shareable link with an unguessable token.
7. **Table reservations:** date, time, party size, branch, seating preference; availability check against capacity per time slot; confirmation email.
8. **Events & catering:** birthday parties, office lunches, almsgivings (dana), weddings/homecomings. Form with date, guest count, package, budget, notes. Creates an inquiry the admin can quote and accept; optional deposit via PayHere.
9. **Account:** order history, one-tap reorder, saved addresses, booking history, loyalty points (simple: Rs. 100 = 1 point).
10. **Static pages:** About (story), Branches (map + hours), Contact, FAQ, Privacy Policy, Terms, Refund Policy (PayHere requires these to be live).

### 5.2 Branch dashboard (`/dashboard`, branch staff role)
- Live order board (Kanban columns by status) with sound + Web Push alerts for new orders
- Accept / reject (with reason) / update status; auto-reject timer if not accepted in N minutes (configurable)
- Printable kitchen ticket and customer receipt (print CSS, 80mm thermal width)
- Toggle items sold out for this branch; pause online ordering
- Today's reservations list

### 5.3 Admin panel (`/admin`, admin role, MFA required)
- Menu CRUD with image upload (Supabase Storage), translations, per-branch price overrides and availability
- Branch CRUD: address, map pin, delivery radius, delivery fee tiers, hours, holidays
- Orders across all branches with filters and CSV export
- Reservations calendar and event inquiries pipeline (New → Quoted → Confirmed → Done)
- Promo codes (percentage/fixed, min spend, expiry, usage limits)
- Settings (brand config, charges, feature flags)
- Simple reports: revenue by day/branch, top items, order type split (Recharts)
- Staff management: invite users, assign role and branch
- Audit log viewer

---

## 6. Data Model (Supabase / Postgres)

Core tables (all with `id uuid`, `created_at`, `updated_at`):

- `profiles` (user_id → auth.users, full_name, phone, role: `customer | staff | manager | admin`, branch_id nullable)
- `branches` (name, slug, address, district, city, lat, lng, phone, delivery_radius_km, delivery_fee_rules jsonb, opening_hours jsonb, is_accepting_orders)
- `categories` (name_i18n jsonb, sort_order, is_active)
- `menu_items` (category_id, name_i18n, description_i18n, base_price_cents, image_path, dietary_tags text[], spice_selectable bool, is_alcohol bool, is_active)
- `item_options` / `item_option_values` (portion, add-ons, with price deltas)
- `branch_menu_overrides` (branch_id, menu_item_id, price_cents nullable, is_available)
- `addresses` (user_id, label, district, city, line, landmark, lat, lng)
- `orders` (public_token, branch_id, user_id nullable, guest contact fields, type, status, scheduled_for, subtotal/service/vat/delivery/discount/total in cents, payment_method, payment_status, notes, idempotency_key unique)
- `order_items` (order_id, menu_item_id, name snapshot, unit_price snapshot, options snapshot jsonb, qty)
- `order_status_events` (order_id, status, actor_id, reason)
- `payments` (order_id, provider, provider_ref, amount_cents, status, raw_payload jsonb, verified bool)
- `reservations` (branch_id, user/guest contact, date, time_slot, party_size, status)
- `event_inquiries` (contact, event_type, date, guests, package, budget, status, quote_cents, deposit_status)
- `promo_codes`, `promo_redemptions`
- `loyalty_ledger`
- `reviews` (moderated)
- `settings` (single row, brand + charges + flags)
- `audit_logs` (actor, action, entity, before, after, ip)

Use SQL migrations in `supabase/migrations/` and a `supabase/seed.sql` with the full demo menu (40+ items), 3 branches, demo staff and admin users.

---

## 7. Security (non-negotiable)

**Data & access**
- Row Level Security on **every** table. Customers see only their own rows; staff only their branch; admins all. Write RLS tests.
- Never expose the Supabase service role key to the browser. Privileged operations run only in Server Actions / Route Handlers.
- Role checks on the server for every dashboard/admin route (middleware + server-side guard; never trust the UI).
- Admin and manager accounts require TOTP MFA (Supabase Auth MFA).

**Orders & payments**
- **Server recalculates every price** from the DB; the client cart is only a list of item IDs, options and quantities.
- Validate all inputs with Zod on the server.
- Idempotency key on order creation to stop double orders.
- PayHere: generate the hash server-side using the merchant secret; verify `md5sig` on the `notify_url` webhook before marking any order paid; compare amount and currency to the stored order; ignore the browser return URL as proof of payment; store the raw payload.
- Order tracking uses a long random `public_token`, never sequential IDs.

**Abuse protection**
- Rate limiting (Upstash) on login, signup, OTP, checkout, reservations, contact and event forms.
- Cloudflare Turnstile on public forms and guest checkout.
- Account lockout / backoff after repeated failed logins.

**Web hardening**
- Strict security headers in `next.config` / middleware: Content-Security-Policy (with nonces), HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Secure, HttpOnly, SameSite cookies (handled via `@supabase/ssr`).
- Sanitise any user text rendered back (reviews, notes); no `dangerouslySetInnerHTML` with user content.
- Image uploads: admin only, type and size checks, stored in a bucket with policies.

**Secrets & supply chain**
- All secrets in environment variables; `.env.example` committed, `.env*` gitignored.
- GitHub: Dependabot alerts + updates, secret scanning, branch protection on `main` (PR + passing CI required). CodeQL if the repo is public (it is free for public repos).
- `npm audit` step in CI.

**Privacy & logging**
- Audit log for admin/staff actions.
- Privacy policy aligned with Sri Lanka's Personal Data Protection Act; collect only what's needed.
- Don't log card data (PayHere handles card entry on its own page; we never touch card numbers).

Do a final OWASP Top 10 review checklist in `docs/SECURITY.md`.

---

## 8. UI/UX Standards

- Mobile first (most Sri Lankan customers will order on phones), then tablet and desktop.
- Design system first: tokens, typography scale, spacing, components in `src/components/ui`. Build a hidden `/styleguide` page.
- Smooth, purposeful motion; respect `prefers-reduced-motion`.
- Skeleton loaders, optimistic cart updates, clear empty and error states.
- Accessibility: WCAG 2.2 AA, keyboard navigation, focus rings, labels, alt text, colour contrast.
- Performance: `next/image`, AVIF/WebP, lazy load below the fold, font subsetting, keep JS lean, ISR for the menu.
- SEO: metadata per page, Open Graph images, `Restaurant` and `Menu` JSON-LD schema, sitemap, robots.txt.
- PWA: installable, offline fallback page.
- Dark mode optional; nail light mode first.

---

## 9. Repository & Workflow

- GitHub repo: `restaurant-platform-demo` (private recommended; public if you want free CodeQL and to show it as portfolio).
- Branches: `main` (protected, always deployable), `dev`, feature branches `feat/...`.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `security:`).
- Tag releases at the end of each phase: `v0.1.0`, `v0.2.0`, ... with a `CHANGELOG.md`, so any version can be revisited.
- Every PR gets a Vercel preview URL. The client receives a stable preview (from `main` or a `demo` branch alias).
- CI workflow: install → lint (ESLint) → typecheck (`tsc --noEmit`) → unit tests → build → Playwright smoke tests.
- `README.md`: setup, env vars, scripts, how to rebrand for a new client.

Suggested structure:
```
src/
  app/
    [locale]/(site)/...        # public pages
    [locale]/(account)/...
    dashboard/...              # branch staff
    admin/...
    api/payhere/notify/route.ts
  components/{ui,site,dashboard,admin}
  config/brand.ts
  lib/{supabase,payments,pricing,validation,ratelimit,i18n}
  messages/{en,si,ta}.json
supabase/{migrations,seed.sql}
tests/{unit,e2e}
docs/{PLAN.md,SECURITY.md,CREDITS.md,REBRANDING.md}
```

---

## 10. Phased Roadmap

**Phase 0: Setup (v0.1.0)**
Repo, Next.js + TS + Tailwind + shadcn, ESLint/Prettier, CI, Vercel link, Supabase project, env handling, security headers baseline, brand config, design tokens, `/styleguide`.

**Phase 1: Public site & menu (v0.2.0)**
Layout, header/footer, home page, menu with filters/search, item sheet, branches page with map, static pages, i18n (EN first, SI/TA scaffolding), seed data, SEO.

**Phase 2: Cart & checkout (v0.3.0)**
Cart, checkout flow, branch selection and delivery radius, server-side pricing engine with tests, guest + logged-in checkout, Cash on Delivery orders, confirmation email, order tracking page with realtime.

**Phase 3: Payments (v0.4.0)**
PayHere sandbox integration, secure hash, webhook verification, payment status handling, failure/retry flows, refund policy page.

**Phase 4: Branch dashboard (v0.5.0)**
Staff auth and roles, live order board, alerts (sound + Web Push + optional Telegram), status updates, sold-out toggles, print tickets.

**Phase 5: Reservations & events (v0.6.0)**
Table booking with capacity logic, event/catering inquiry pipeline, quotes, optional deposit, emails.

**Phase 6: Admin panel (v0.7.0)**
Menu/branch/promo/settings CRUD, MFA, reports, staff management, audit logs.

**Phase 7: Extras (v0.8.0)**
Accounts (history, reorder, saved addresses), loyalty points, reviews with moderation, PWA, Sinhala and Tamil translations completed.

**Phase 8: Hardening & polish (v1.0.0)**
Full security review against `docs/SECURITY.md`, RLS tests, Playwright E2E for main journeys, Lighthouse 90+, accessibility audit, demo ribbon, `/demo` page, rebranding guide, final client preview.

---

## 11. Demo Script (for client meetings)

1. Open home page on a phone → language switch to Sinhala.
2. Order a chicken kottu (Sri Lankan Hot) + wattalappan for delivery, pin location, pay with PayHere sandbox card.
3. On a laptop, show the Colombo branch dashboard: order pops in with a sound, accept it, move to Preparing.
4. Back on the phone, tracking page updates live.
5. Book a table for 6 and submit a birthday party inquiry.
6. Admin: mark an item sold out, change a price, create a promo, show the revenue report.
7. Show how fast the site re-brands (swap logo, colours, name).

---

## 12. Future Upgrade Options (paid, offer to clients later)
WhatsApp Business API / SMS (Dialog, Mobitel) notifications, PickMe/Uber Direct delivery integration, POS integration, live PayHere account, custom domain, Vercel Pro hosting, rider app with live GPS.
