# Restaurant Platform Demo

A white-label restaurant website and ordering platform, built as a sales demo for Sri Lankan restaurants. The demo brand is **Kithul & Co.**, a fictional chain with branches in Colombo 07, Nugegoda and Kandy.

- **Plan:** [docs/PLAN.md](docs/PLAN.md). Changes to the plan: [docs/DECISIONS.md](docs/DECISIONS.md)
- **Security:** [docs/SECURITY.md](docs/SECURITY.md)
- **Rebranding for a new client:** [docs/REBRANDING.md](docs/REBRANDING.md)
- **Taking a client live:** [docs/LAUNCH.md](docs/LAUNCH.md)
- **Demo tour for client meetings:** `/demo` on any demo deployment
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)

## Stack

Next.js 16 (App Router, TypeScript strict), Tailwind CSS 4, shadcn/ui, Supabase (Postgres, Auth, Realtime, Storage), Zod, Vitest, Playwright. Hosted on Vercel. Everything runs on free tiers.

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The app runs with an empty `.env.local`; each integration falls back to safe local behaviour until you add its keys (emails print to the console, bot checks use Cloudflare's test keys, and so on). Without Supabase, the menu, branches and offers come straight from the demo data in `src/data/seed.ts`.

### Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com) (Singapore is the closest region to Sri Lanka).
2. Copy the project URL, publishable key and secret key into `.env.local`.
3. Sign in to the CLI once, link the project and push the schema and demo data:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase db push --include-seed
```

Add the same three variables to the Vercel project (Settings → Environment Variables) so previews use the database too.

Ordering, tracking and accounts need Supabase; without it the checkout shows a "not available" notice. For the demo, turn off **Authentication → Sign In / Providers → Email → Confirm email** in the Supabase dashboard. Supabase's built-in email service only delivers to the project's team members, so other people can't confirm their sign-up otherwise (docs/DECISIONS.md D10).

### Online payments (PayHere)

Without PayHere keys, customers pay in cash. To take payments online (sandbox, no real money):

1. Create a free account at [sandbox.payhere.lk](https://sandbox.payhere.lk).
2. In **Integrations**, add the production domain (for this demo `restaurant-platform-demo-alpha.vercel.app`) and copy the Merchant ID and the Merchant Secret shown next to the domain.
3. In Vercel, add `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET` (mark it sensitive) and `PAYHERE_SANDBOX=true` for **Production** only, then redeploy.

PayHere only accepts payments started from the registered domain and must be able to reach `/api/payments/payhere/notify`, so online payment works on production, not on previews or localhost (docs/DECISIONS.md D32). Sandbox test card: `4916 2175 0161 1292`, any future expiry, any name and CVV. `4024 0071 9434 9121` is declined.

### Branch dashboard

Staff use `/dashboard` (sign in on the normal sign-in page). To make someone staff, have them sign up on the site, then in the Supabase SQL editor:

```sql
update public.profiles
set role = 'staff', branch_id = (select id from public.branches where slug = 'colombo-07')
where id = (select id from auth.users where email = 'person@example.com');
```

Roles: `staff` and `manager` (one branch), `admin` (every branch). Orders not accepted within 10 minutes are rejected automatically; change or turn this off (0) with `settings.brand.orders.autoRejectMinutes`.

Alerts on staff phones and computers (Web Push) need VAPID keys: run `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (sensitive) and `VAPID_SUBJECT` (`mailto:` address) in Vercel. For Telegram alerts, create a bot with @BotFather, set `TELEGRAM_BOT_TOKEN`, add the bot to the branch's group and store the group's chat ID in `branch_secrets.telegram_chat_id`.

### Bookings and events

Table bookings (`/reservations`) and event enquiries (`/events`) need Supabase, like ordering. Their rules (seat share, how long tables are held, party sizes, notice, menus and deposit) are in `settings.brand.reservations` and `settings.brand.events`. Managers and admins quote events from the dashboard's Events tab; staff can see enquiries but not price them.

### Admin panel

Admins manage the menu, branches, promo codes, staff and settings at `/admin`. To make the first admin, sign up on the site, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

On the next visit to `/admin` you'll be asked to set up two-step sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…). Managers need it too. After that, add other staff from the Staff page.

### Customer accounts

Signed-in customers get `/account`: points, past orders with "Order again", bookings and saved addresses. Loyalty rates (spend per point, what a point is worth, how much of the food points can pay for) are in Admin → Settings; turn the programme off under Features. Customers review completed orders from the tracking page, and reviews appear on the home page once approved in Admin → Reviews.

The site can be installed from the browser ("Add to Home screen"). Its service worker only steps in when a page can't load, to show an offline page; menus and prices always come from the network.

### Testing orders

The order, payment, dashboard, booking, admin and account journeys in `tests/e2e/order.spec.ts`, `payment.spec.ts`, `dashboard.spec.ts`, `reservation.spec.ts`, `admin.spec.ts` and `account.spec.ts` need a database and are skipped by default. CI runs them against a local Supabase (`supabase start`, which needs Docker). To run them yourself against the database in `.env.local`, build first, then:

```bash
E2E_DATABASE=1 npx playwright test tests/e2e/order.spec.ts --project=mobile
```

The payment journeys also need `PAYHERE_MERCHANT_ID` and `PAYHERE_MERCHANT_SECRET` set to made-up values: they stand in for PayHere and sign its notifications themselves. The dashboard, admin and account journeys and the manager's part of the events journey create accounts, so they only run against a local Supabase. Each run places real test orders in that database.

## Scripts

| Script                            | What it does                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Development server                                                                                                            |
| `npm run build` / `npm start`     | Production build and server                                                                                                   |
| `npm run lint`                    | ESLint                                                                                                                        |
| `npm run format` / `format:check` | Prettier write / check                                                                                                        |
| `npm run typecheck`               | `tsc --noEmit`                                                                                                                |
| `npm test`                        | Unit tests (Vitest)                                                                                                           |
| `npm run test:e2e`                | Browser tests (Playwright) against a production build. Run `npm run build` first, and `npx playwright install chromium` once. |
| `npm run check`                   | Everything CI runs, except the browser tests                                                                                  |
| `npm run db:seed`                 | Regenerate `supabase/seed.sql` from `src/data/seed.ts`                                                                        |

## Environment variables

All variables are documented in [.env.example](.env.example). Public values (`NEXT_PUBLIC_*`) are read in `src/lib/public-env.ts`; server values are validated in `src/lib/env.ts`, which must only be imported from server code.

## Project layout

```
src/
  app/            Routes: [locale]/(site) for the public site, (staff) for the branch dashboard and admin panel, (internal) for the styleguide
  components/     ui/ (design system, shadcn/ui based), site/, home/, menu/, branches/, cart/, checkout/, track/, auth/, payments/, dashboard/, reservations/, events/, admin/, account/
  config/         Brand defaults, fonts and photos: the main rebranding surface
  content/        Policy text
  data/seed.ts    Demo content (source of supabase/seed.sql and the no-database fallback)
  emails/         Email templates (React Email)
  i18n/           Locale routing and message loading
  lib/            Data access, cart, orders, payments, reservations, events, dashboard, accounts, reviews, pricing, money, hours, phone numbers, auth, email, alerts, security, Supabase clients, env
  messages/       UI text in English, Sinhala and Tamil
  proxy.ts        Locale routing, per-request CSP and session refresh
supabase/         Migrations and generated seed data
scripts/          Seed, favicon and app icon generators, translation checker
tests/            unit/ (Vitest, including database tests on PGlite) and e2e/ (Playwright)
docs/             Plan, decisions, security, credits, rebranding
```

## Workflow

Each phase of the plan is built on a `feat/phase-N-*` branch, merged into `main` through a pull request (CI must pass, and Vercel posts a preview URL), then tagged `v0.N.0`.

## Licence

Copyright © 2026. All rights reserved. The source is public for review only; no licence to use, copy or modify it is granted.
