import { ArrowUp, Mail, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { BranchView } from "@/lib/data/catalogue";
import { formatPhone } from "@/lib/phone";

import { ContactLink } from "./contact-link";
import { Kolam } from "./kolam";
import { LocalTime } from "./local-time";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "./social-icons";
import { SplitWords } from "./split-words";
import { Wordmark } from "./wordmark";

const heading = "mb-5 font-mono text-[0.7rem] font-medium tracking-[0.2em] uppercase opacity-60";
const link = "opacity-80 transition-opacity hover:opacity-100";

/** The footer: a last invitation, the branches, every page, and the brand name edge to edge. */
export async function SiteFooter({ brand, branches }: { brand: Brand; branches: BranchView[] }) {
  const t = await getTranslations("Footer");
  const nav = await getTranslations("Nav");
  const year = new Date().getFullYear();

  const social = [
    { href: brand.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: brand.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: brand.social.tiktok, label: "TikTok", Icon: TikTokIcon },
    { href: brand.social.youtube, label: "YouTube", Icon: YouTubeIcon },
  ].filter((s): s is typeof s & { href: string } => Boolean(s.href));

  return (
    <footer className="relative mt-auto overflow-hidden surface-ink">
      <div aria-hidden className="lotus-border opacity-70" />
      <Kolam
        size={9}
        className="pointer-events-none absolute -top-40 -right-40 w-[36rem] text-highlight opacity-[0.07]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 border-b border-[var(--border)] py-16 md:flex-row md:items-end md:justify-between lg:py-24">
          <h2 data-reveal="words" className="max-w-3xl text-display-xl text-balance">
            <SplitWords markup={t.markup("ctaTitle", { em: (c) => `<em>${c}</em>` })} />
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
            >
              <Link href="/menu">{nav("orderNow")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[var(--border)] bg-transparent text-current hover:bg-white/5 hover:text-current"
            >
              <Link href="/reservations">{nav("bookTable")}</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <p className="max-w-xs text-base opacity-85">{t("about")}</p>
            <p className="opacity-70">{brand.hoursSummary}</p>
            {social.length > 0 && (
              <div>
                <h3 className="sr-only">{t("followUs")}</h3>
                <ul className="flex gap-2">
                  {social.map(({ href, label, Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex size-10 items-center justify-center rounded-full border border-[var(--border)] transition-colors hover:border-highlight hover:text-highlight"
                      >
                        <Icon className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h3 className={heading}>{t("visit")}</h3>
            <ul className="space-y-5">
              {branches.map((branch) => (
                <li key={branch.id} className="space-y-0.5">
                  <p className="font-display text-xl">{branch.name}</p>
                  <p className="opacity-70">
                    {branch.addressLine}, {branch.city}
                  </p>
                  <ContactLink kind="tel" value={branch.phone} className={link}>
                    {formatPhone(branch.phone)}
                  </ContactLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={heading}>{t("explore")}</h3>
            <ul className="space-y-2.5">
              {(
                [
                  ["/menu", nav("menu")],
                  ["/branches", nav("branches")],
                  ["/reservations", nav("bookTable")],
                  ["/events", nav("events")],
                  ["/about", nav("about")],
                  ["/contact", nav("contact")],
                  ["/faq", nav("faq")],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className={link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={heading}>{t("contact")}</h3>
            <ul className="space-y-2.5">
              <li>
                <ContactLink
                  kind="tel"
                  value={brand.contact.phone}
                  className={`${link} inline-flex items-center gap-2`}
                >
                  <Phone aria-hidden className="size-4" />
                  {formatPhone(brand.contact.phone)}
                </ContactLink>
              </li>
              {brand.contact.whatsapp && (
                <li>
                  <ContactLink
                    kind="whatsapp"
                    value={brand.contact.whatsapp}
                    className={`${link} inline-flex items-center gap-2`}
                  >
                    <MessageCircle aria-hidden className="size-4" />
                    {t("whatsapp")}
                  </ContactLink>
                </li>
              )}
              <li>
                <ContactLink
                  kind="email"
                  value={brand.contact.email}
                  className={`${link} inline-flex items-center gap-2 break-all`}
                >
                  <Mail aria-hidden className="size-4 shrink-0" />
                  {brand.contact.email}
                </ContactLink>
              </li>
            </ul>
            <p className="mt-8 font-mono text-xs tracking-[0.15em] uppercase opacity-60">
              {t("localTime")} · <LocalTime />
            </p>
            <p className="mt-2 text-xs opacity-60">{t("payments")}</p>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Wordmark text={brand.name} className="text-background/95" />
      </div>

      <div className="relative border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs opacity-70 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{t("copyright", { year, name: brand.name })}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/privacy" className={`${link} inline-flex min-h-6 items-center`}>
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={`${link} inline-flex min-h-6 items-center`}>
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/refunds" className={`${link} inline-flex min-h-6 items-center`}>
                {t("refunds")}
              </Link>
            </li>
          </ul>
          <p>{t("demoNotice", { name: brand.name })}</p>
          <a href="#main" className={`${link} inline-flex items-center gap-1`}>
            {t("backToTop")}
            <ArrowUp aria-hidden className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
