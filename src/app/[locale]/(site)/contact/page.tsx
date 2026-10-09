import { Mail, MessageCircle, PartyPopper, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ContactLink } from "@/components/site/contact-link";
import { OpenStatus } from "@/components/site/open-status";
import { PageHeader } from "@/components/site/page-header";
import { Splash } from "@/components/site/splash";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches } from "@/lib/data/catalogue";
import { formatPhone } from "@/lib/phone";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("contactTitle"),
    description: t("contactDescription", { name: brand.name }),
  });
}

const linkClass =
  "inline-flex items-center gap-2 rounded-lg font-medium underline-offset-4 hover:underline";

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = (await params).locale as Locale;
  const [t, footer, brand, branches] = await Promise.all([
    getTranslations("Contact"),
    getTranslations("Footer"),
    getBrand(),
    getBranches(locale),
  ]);

  return (
    <>
      <Splash />
      <PageHeader tone="lacquer" eyebrow={brand.name} title={t("title")} intro={t("subtitle")} />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-14 pb-28 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-8 lg:pt-20">
        <section
          aria-labelledby="general"
          data-reveal
          className="flex flex-col gap-6 rounded-[1.75rem] bg-highlight p-7 text-highlight-foreground shadow-soft"
        >
          <h2 id="general" className="font-display text-2xl">
            {t("general")}
          </h2>
          <ContactLink
            kind="tel"
            value={brand.contact.phone}
            className="font-poster text-display-lg leading-none break-words underline-offset-8 hover:underline"
          >
            {formatPhone(brand.contact.phone)}
          </ContactLink>
          <ul className="space-y-3">
            {brand.contact.whatsapp && (
              <li>
                <ContactLink kind="whatsapp" value={brand.contact.whatsapp} className={linkClass}>
                  <MessageCircle aria-hidden className="size-4" />
                  {footer("whatsapp")}
                </ContactLink>
              </li>
            )}
            <li>
              <ContactLink
                kind="email"
                value={brand.contact.email}
                className={`${linkClass} break-all`}
              >
                <Mail aria-hidden className="size-4 shrink-0" />
                {brand.contact.email}
              </ContactLink>
            </li>
          </ul>
          <p className="mt-auto border-t border-current/20 pt-5 text-sm opacity-85">
            {brand.hoursSummary}
          </p>
        </section>

        <section
          aria-labelledby="branch-contacts"
          data-reveal
          className="space-y-5 rounded-[1.75rem] bg-card p-7 shadow-soft ring-1 ring-border/70"
        >
          <h2 id="branch-contacts" className="font-display text-2xl text-primary">
            {t("branchContacts")}
          </h2>
          <ul className="divide-y divide-dashed">
            {branches.map((b) => (
              <li key={b.id} className="space-y-1.5 py-4 first:pt-0 last:pb-0">
                <p className="font-poster text-3xl leading-none">{b.name}</p>
                <OpenStatus hours={b.openingHours} />
                <ContactLink kind="tel" value={b.phone} className={`${linkClass} text-primary`}>
                  <Phone aria-hidden className="size-4" />
                  {formatPhone(b.phone)}
                </ContactLink>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="events"
          data-reveal
          className="flex flex-col gap-4 rounded-[1.75rem] bg-secondary p-7 text-secondary-foreground shadow-soft"
        >
          <PartyPopper aria-hidden className="size-8 text-highlight" />
          <h2 id="events" className="font-display text-2xl">
            {t("eventsTitle")}
          </h2>
          <p className="text-pretty text-secondary-foreground/90">{t("eventsBody")}</p>
          {brand.contact.whatsapp && (
            <ContactLink
              kind="whatsapp"
              value={brand.contact.whatsapp}
              className="mt-auto inline-flex h-11 items-center gap-2 self-start rounded-full bg-highlight px-5 font-semibold text-highlight-foreground"
            >
              <MessageCircle aria-hidden className="size-4" />
              {footer("whatsapp")}
            </ContactLink>
          )}
        </section>
      </div>
    </>
  );
}
