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

Open http://localhost:3000. The app runs with an empty `.env.local`; each integration falls back to safe local behaviour until you add its keys (emails print to the console, bot checks use Cloudflare's test keys, and so on).

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

## Environment variables

All variables are documented in [.env.example](.env.example). Public values (`NEXT_PUBLIC_*`) are read in `src/lib/public-env.ts`; server values are validated in `src/lib/env.ts`, which must only be imported from server code.

## Project layout

```
src/
  app/            Routes (App Router)
  components/ui/  Design-system components (shadcn/ui based)
  config/         Brand defaults and fonts: the main rebranding surface
  lib/            Money, security, Supabase clients, env
  proxy.ts        Per-request headers (CSP); i18n and session refresh later
supabase/         Migrations and seed data
tests/            unit/ (Vitest) and e2e/ (Playwright)
docs/             Plan, decisions, security, credits, rebranding
```

## Workflow

Each phase of the plan is built on a `feat/phase-N-*` branch, merged into `main` through a pull request (CI must pass, and Vercel posts a preview URL), then tagged `v0.N.0`.

## Licence

Copyright © 2026. All rights reserved. The source is public for review only; no licence to use, copy or modify it is granted.
