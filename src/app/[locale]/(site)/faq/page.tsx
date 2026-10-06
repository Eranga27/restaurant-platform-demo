import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { JsonLd } from "@/components/site/json-ld";
import { PageHeader } from "@/components/site/page-header";
import { Splash } from "@/components/site/splash";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";

const QUESTIONS = [
  "delivery",
  "fees",
  "payment",
  "charges",
  "dietary",
  "spice",
  "poya",
  "bookings",
  "catering",
] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/faq",
    title: t("faqTitle"),
    description: t("faqDescription", { name: brand.name }),
  });
}

export default async function FaqPage() {
  const [t, brand] = await Promise.all([getTranslations("Faq"), getBrand()]);
  const values = { serviceCharge: brand.charges.serviceChargeBps / 100 };
  const items = QUESTIONS.map((key) => ({
    key,
    q: t(`items.${key}.q`),
    a: t(`items.${key}.a`, values),
  }));

  return (
    <>
      <Splash />
      <div className="mx-auto w-full max-w-4xl px-4 pt-14 pb-24 sm:px-6 lg:px-8 lg:pt-24">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }}
        />
        <PageHeader eyebrow={brand.name} title={t("title")} />
        <Accordion
          type="single"
          collapsible
          className="rounded-2xl border bg-card px-5 shadow-soft"
        >
          {items.map(({ key, q, a }) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="py-5 text-left text-base font-semibold">
                {q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-base text-pretty text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
