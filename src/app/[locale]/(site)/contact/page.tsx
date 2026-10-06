import { Mail, MessageCircle, Phone, PartyPopper } from "lucide-react";
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
  "inline-flex items-center gap-2 rounded-lg font-medium text-primary underline-offset-4 hover:underline";

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
      <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-20 sm:px-6 lg:px-8 lg:pt-24">
        <PageHeader eyebrow={brand.name} title={t("title")} intro={t("subtitle")} />

        <div className="grid gap-6 lg:grid-cols-3">
          <section
            aria-labelledby="general"
            className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft"
          >
            <h2 id="general" className="font-display text-2xl text-primary">
              {t("general")}
            </h2>
            <ul className="space-y-3">
              <li>
                <ContactLink kind="tel" value={brand.contact.phone} className={linkClass}>
                  <Phone aria-hidden className="size-4" />
                  {formatPhone(brand.contact.phone)}
                </ContactLink>
              </li>
              {brand.contact.whatsapp && (
                <li>
                  <ContactLink kind="whatsapp" value={brand.contact.whatsapp} className={linkClass}>
                    <MessageCircle aria-hidden className="size-4" />
                    {footer("whatsapp")}
                  </ContactLink>
                </li>
              )}
              <li>
                <ContactLink kind="email" value={brand.contact.email} className={linkClass}>
                  <Mail aria-hidden className="size-4" />
                  {brand.contact.email}
                </ContactLink>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">{brand.hoursSummary}</p>
          </section>

          <section
            aria-labelledby="branch-contacts"
            className="space-y-4 rounded-2xl border bg-card p-6 shadow-soft"
          >
            <h2 id="branch-contacts" className="font-display text-2xl text-primary">
              {t("branchContacts")}
            </h2>
            <ul className="space-y-5">
              {branches.map((b) => (
                <li key={b.id} className="space-y-1">
                  <p className="font-semibold">{b.name}</p>
                  <OpenStatus hours={b.openingHours} />
                  <ContactLink kind="tel" value={b.phone} className={linkClass}>
                    <Phone aria-hidden className="size-4" />
                    {formatPhone(b.phone)}
                  </ContactLink>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="events"
            className="space-y-4 rounded-2xl bg-secondary p-6 text-secondary-foreground shadow-soft"
          >
            <PartyPopper aria-hidden className="size-7 text-highlight" />
            <h2 id="events" className="font-display text-2xl">
              {t("eventsTitle")}
            </h2>
            <p className="text-pretty text-secondary-foreground/90">{t("eventsBody")}</p>
            {brand.contact.whatsapp && (
              <ContactLink
                kind="whatsapp"
                value={brand.contact.whatsapp}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-highlight px-4 font-medium text-highlight-foreground"
              >
                <MessageCircle aria-hidden className="size-4" />
                {footer("whatsapp")}
              </ContactLink>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
