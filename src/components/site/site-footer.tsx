import { Mail, MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Brand } from "@/config/brand";
import { Link } from "@/i18n/navigation";
import type { BranchView } from "@/lib/data/catalogue";
import { formatPhone } from "@/lib/phone";

import { ContactLink } from "./contact-link";
import { Logo } from "./logo";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "./social-icons";

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

  const linkClass = "text-primary-foreground/80 transition-colors hover:text-primary-foreground";

  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="inline-flex rounded-xl bg-background px-3 py-2">
            <Logo brand={brand} />
          </div>
          <p className="max-w-xs text-sm text-primary-foreground/80">{t("about")}</p>
          <p className="text-sm text-primary-foreground/80">{brand.hoursSummary}</p>
          {social.length > 0 && (
            <div>
              <h2 className="sr-only">{t("followUs")}</h2>
              <ul className="flex gap-2">
                {social.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg">{t("visit")}</h2>
          <ul className="space-y-4 text-sm">
            {branches.map((branch) => (
              <li key={branch.id}>
                <p className="font-semibold">{branch.name}</p>
                <p className="text-primary-foreground/80">
                  {branch.addressLine}, {branch.city}
                </p>
                <ContactLink kind="tel" value={branch.phone} className={linkClass}>
                  {formatPhone(branch.phone)}
                </ContactLink>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg">{t("explore")}</h2>
          <ul className="space-y-2 text-sm">
            {(
              [
                ["/menu", nav("menu")],
                ["/branches", nav("branches")],
                ["/about", nav("about")],
                ["/contact", nav("contact")],
                ["/faq", nav("faq")],
              ] as const
            ).map(([href, label]) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 space-y-2 text-sm">
            <li>
              <ContactLink
                kind="tel"
                value={brand.contact.phone}
                className={`${linkClass} inline-flex items-center gap-2`}
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
                  className={`${linkClass} inline-flex items-center gap-2`}
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
                className={`${linkClass} inline-flex items-center gap-2`}
              >
                <Mail aria-hidden className="size-4" />
                {brand.contact.email}
              </ContactLink>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg">{t("legal")}</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className={linkClass}>
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/refunds" className={linkClass}>
                {t("refunds")}
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-sm text-primary-foreground/80">{t("payments")}</p>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-primary-foreground/70 sm:flex-row sm:justify-between sm:px-6">
          <p>{t("copyright", { year, name: brand.name })}</p>
          <p>{t("demoNotice", { name: brand.name })}</p>
        </div>
      </div>
    </footer>
  );
}
