# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the phases in `docs/PLAN.md`.

## [Unreleased]

## [0.1.0] - Phase 0: Setup

### Added

- Next.js 16 app (App Router, TypeScript strict, React Compiler) with Tailwind CSS 4 and shadcn/ui.
- Brand configuration (`src/config/brand.ts`) with typed defaults for Kithul & Co.: colours, contact details, feature flags and charges.
- Design tokens (spice, kithul and curry-leaf palette; Fraunces and DM Sans, with Noto Sans Sinhala and Tamil) and a hidden `/styleguide` page.
- Security headers: HSTS, frame denial, nosniff, referrer and permissions policies, and a Content-Security-Policy with per-request nonces on sensitive routes.
- Validated environment handling, with every third-party service optional during development.
- Supabase client helpers for server, browser and privileged server use.
- Money helpers that keep all amounts in integer cents.
- CI on every pull request: lint, format check, typecheck, unit tests, dependency audit, build and Playwright smoke tests. CodeQL, Dependabot and a daily Supabase keep-alive.
- Project docs: plan, decisions, security, credits and rebranding guide.
