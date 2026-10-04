# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the phases in `docs/PLAN.md`.

## [Unreleased]

## [0.2.0] - Phase 1: Public site and menu

### Added

- Public site in English, Sinhala and Tamil (next-intl): English at `/`, Sinhala at `/si`, Tamil at `/ta`, with a language switcher in the header. Sinhala and Tamil cover the navigation, home, menu and branch pages; anything untranslated falls back to English. Translations are drafts awaiting native-speaker review.
- Header with mobile navigation, footer, skip link, demo ribbon and a Poya day banner.
- Home page: photo hero, signature dishes, current offers, branch finder with live open/closed status and "use my location", guest reviews, story and events sections.
- Menu: 53 dishes in 9 categories with sticky category tabs, search, dietary filters (vegetarian, vegan, halal, no nuts), per-branch prices and sold-out states. Alcohol is shown as unavailable on Poya days.
- Dish sheet with portion and add-on choices, spice level, special instructions, quantity and a live total. Every dish has a shareable link (`/menu?item=…`). Ordering itself arrives in Phase 2.
- Branches page with an OpenStreetMap map, opening hours, delivery radius and directions.
- About, Contact, FAQ, Privacy, Terms and Refund pages.
- Database schema with Row Level Security on every table: roles and profiles, branches, menu, options, per-branch overrides, promotions, holidays, reviews and settings.
- Demo data from a single source (`src/data/seed.ts`, generated into `supabase/seed.sql`). The site reads it directly when Supabase isn't configured.
- SEO: per-page metadata with canonical and hreflang links, Restaurant, Menu and FAQ structured data, a generated share image, sitemap and robots.txt. Indexing is off for demo deployments.
- Tests for the database access rules (on PGlite), item pricing, opening hours, phone numbers and distances, plus Playwright journeys for every public page. CI also applies the migrations and seed to the Supabase Postgres image.

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
