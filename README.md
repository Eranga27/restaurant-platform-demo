# Restaurant Platform Demo

A white-label restaurant website and ordering platform, built as a sales demo for Sri Lankan restaurants. The demo brand is **Kithul & Co.**, a fictional chain with branches in Colombo 07, Nugegoda and Kandy.

- **Plan:** [docs/PLAN.md](docs/PLAN.md). Changes to the plan: [docs/DECISIONS.md](docs/DECISIONS.md)
- **Security:** [docs/SECURITY.md](docs/SECURITY.md)
- **Rebranding for a new client:** [docs/REBRANDING.md](docs/REBRANDING.md)
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

### Testing orders

The order journeys in `tests/e2e/order.spec.ts` need a database and are skipped by default. CI runs them against a local Supabase (`supabase start`, which needs Docker). To run them yourself against the database in `.env.local`, build first, then:

```bash
E2E_DATABASE=1 npx playwright test tests/e2e/order.spec.ts --project=mobile
```

Each run places a real (cash on delivery) test order in that database.

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
  app/            Routes: [locale]/(site) for the public site, (internal) for the styleguide
  components/     ui/ (design system, shadcn/ui based), site/, home/, menu/, branches/, cart/, checkout/, track/, auth/
  config/         Brand defaults, fonts and photos: the main rebranding surface
  content/        Policy text
  data/seed.ts    Demo content (source of supabase/seed.sql and the no-database fallback)
  emails/         Email templates (React Email)
  i18n/           Locale routing and message loading
  lib/            Data access, cart, orders, pricing, money, hours, phone numbers, auth, email, security, Supabase clients, env
  messages/       UI text in English, Sinhala and Tamil
  proxy.ts        Locale routing, per-request CSP and session refresh
supabase/         Migrations and generated seed data
scripts/          Seed generator
tests/            unit/ (Vitest, including database tests on PGlite) and e2e/ (Playwright)
docs/             Plan, decisions, security, credits, rebranding
```

## Workflow

Each phase of the plan is built on a `feat/phase-N-*` branch, merged into `main` through a pull request (CI must pass, and Vercel posts a preview URL), then tagged `v0.N.0`.

## Licence

Copyright © 2026. All rights reserved. The source is public for review only; no licence to use, copy or modify it is granted.
