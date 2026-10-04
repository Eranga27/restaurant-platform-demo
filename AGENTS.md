<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

- Plan: `docs/PLAN.md`. Agreed changes to it: `docs/DECISIONS.md` (wins over the plan). Read both before starting a phase.
- Money is always integer cents; percentages are integer basis points. Use `src/lib/money.ts`.
- Brand values come from `src/config/brand.ts` (later merged with the `settings` table). Never hardcode the restaurant name, colours or charges.
- Server env: `src/lib/env.ts` (server only). Public env: `src/lib/public-env.ts`.
- `src/proxy.ts` is not an auth boundary. Check session and role inside every protected page, Server Action and Route Handler.
- Colour tokens live in `src/app/globals.css`; `tests/unit/design-tokens.test.ts` enforces WCAG AA contrast.
- Before a PR: `npm run check`, `npm run build`, `npm run test:e2e`. Conventional commits.
