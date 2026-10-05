# Launch checklist

Everything needed to take a client's restaurant live, in order. The demo deployment uses the same steps with demo mode left on. Rebranding (name, logo, colours, copy) is in [REBRANDING.md](REBRANDING.md).

## 1. Accounts

| Service              | What to set up                                                                                                                                                                                                         | Free tier                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Supabase             | A project in the Tokyo or Singapore region. Auth: email sign-in on; turn **Confirm email** on once custom SMTP (Resend) is set up; MFA (TOTP) on.                                                                      | Yes (pauses after a week idle) |
| Vercel               | Import the GitHub repo. Set the environment variables below; the PayHere ones for **Production** only (D32).                                                                                                           | Yes (Hobby)                    |
| PayHere              | A live merchant account in the client's name, with the production domain approved (Integrations → Domains & Credentials). Their refund, privacy and terms pages must be live first (`/refunds`, `/privacy`, `/terms`). | Per transaction                |
| Resend               | Verify the client's sending domain (DNS records), then send from it.                                                                                                                                                   | Yes                            |
| Upstash Redis        | A database in the same region as Vercel's functions.                                                                                                                                                                   | Yes                            |
| Cloudflare Turnstile | A widget for the production domain (managed mode).                                                                                                                                                                     | Yes                            |
| Web Push (optional)  | `npx web-push generate-vapid-keys`.                                                                                                                                                                                    | —                              |
| Telegram (optional)  | A bot from @BotFather; each branch's chat ID goes in Admin → Branches.                                                                                                                                                 | Yes                            |

## 2. Environment variables (Vercel → Settings → Environment Variables)

| Variable                                                             | Value for a real launch                                    | Secret       |
| -------------------------------------------------------------------- | ---------------------------------------------------------- | ------------ |
| `NEXT_PUBLIC_SITE_URL`                                               | `https://` + the client's domain (canonical links, emails) | No           |
| `NEXT_PUBLIC_DEMO_MODE`                                              | `false` (removes the ribbon and `/demo`, enables calls)    | No           |
| `NEXT_PUBLIC_ALLOW_INDEXING`                                         | `true` (lets search engines in; the sitemap appears)       | No           |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | From Supabase → API Keys                                   | No           |
| `SUPABASE_SECRET_KEY`                                                | From Supabase → API Keys                                   | Yes          |
| `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`                     | From PayHere; Production only                              | Secret: yes  |
| `PAYHERE_SANDBOX`                                                    | `false`                                                    | No           |
| `RESEND_API_KEY`, `EMAIL_FROM`                                       | e.g. `"Restaurant name <orders@client-domain.lk>"`         | Key: yes     |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                 | From Upstash                                               | Token: yes   |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`             | From Cloudflare                                            | Secret: yes  |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | From the generator; subject `mailto:` the owner            | Private: yes |
| `TELEGRAM_BOT_TOKEN`                                                 | From @BotFather                                            | Yes          |

Never upload `.env.local` (it can hold a Vercel token). Every variable is described in [.env.example](../.env.example).

## 3. Database

1. `npx supabase@2.119.0 link --project-ref <ref>`, then `npx supabase@2.119.0 db push`. Add `--include-seed` only for a demo: the seed is Kithul & Co.'s menu.
2. Make the first admin: sign up on the site, then run the SQL in the README. Set up two-step sign-in at `/dashboard/security`.
3. In Admin → Settings: name, contact details, colours, features, charges (check the current VAT rate), loyalty, bookings and events. Turn auto-reject on once staff watch the dashboard.
4. In Admin → Branches: addresses, map pins, delivery radius and fees, opening hours, seats, Telegram chat. Admin → Staff: add managers and staff (managers need two-step sign-in too).
5. Menu, photos, promo codes and holidays (Poya days, closures) in the admin panel.

## 4. Content

- [ ] Menu, prices and photos are the client's own; stock photos credited in `docs/CREDITS.md`.
- [ ] Home and About copy rewritten for the client (`src/messages/*.json`, `Home` and `About`).
- [ ] Sinhala and Tamil reviewed by a native speaker.
- [ ] Privacy, terms and refund policies reviewed by the client's lawyer (`src/content/legal`), aligned with the Personal Data Protection Act.
- [ ] Contact details, social links and opening hours correct.

## 5. Domain

- [ ] Add the domain in Vercel; HTTPS is automatic.
- [ ] The site sends HSTS with `preload`. Only submit the domain to hstspreload.org if every subdomain will always be HTTPS.
- [ ] PayHere's approved domain, Turnstile's widget and Resend's sending domain all match it.

## 6. Final checks on production

- [ ] A real card order of a small amount, paid, accepted and completed on the dashboard; then refund it in the PayHere portal and record it in Admin → Payments.
- [ ] A cash order, a table booking and an event enquiry, with the emails arriving.
- [ ] New-order alerts on each branch's tablet (sound after "Start shift", push, Telegram).
- [ ] Each page in English, Sinhala and Tamil on a phone.
- [ ] PageSpeed Insights (pagespeed.web.dev) on the home and menu pages.
- [ ] Keyboard-only pass through ordering and booking; a screen reader pass (TalkBack or VoiceOver) through the menu and checkout.
- [ ] `PLAYWRIGHT_BASE_URL=https://<domain> npx playwright test tests/e2e/smoke.spec.ts tests/e2e/a11y.spec.ts`.

## 7. After launch

- Supabase's free tier keeps no point-in-time backups: export the database weekly (Supabase → Database → Backups) or move to Pro for daily backups.
- Watch Vercel's function logs and Supabase's logs for errors; flagged PayHere notifications appear in Admin → Payments.
- Keep Dependabot updates merged. Rotate keys when someone leaves.

## Quality at v1.0.0

Measured on a production build (`next start`), October 2026.

| Check                                                          | Result                                                                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Lighthouse, desktop (home, menu)                               | Performance 98, Accessibility 100, Best Practices 100                                                            |
| Lighthouse, mobile (home, menu)                                | Performance 75 to 79, Accessibility 100, Best Practices 100                                                      |
| Real page load, this machine                                   | Main image painted in about 1 s                                                                                  |
| SEO                                                            | 61 in demo mode (indexing deliberately off); with indexing on and the real domain set, the remaining checks pass |
| axe, WCAG 2.2 AA (16 pages and two dialogs, phone and desktop) | No violations                                                                                                    |

Lighthouse's mobile run simulates a slow 4G phone (1.6 Mbps): there, the framework's JavaScript and the two web fonts share the line with the hero photo. Ways to go further if a client needs it are in docs/DECISIONS.md (D71).
