import { ArrowRight } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";
import { CURTAIN } from "@/lib/transitions";

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
  const [t, nav, brand] = await Promise.all([
    getTranslations("Faq"),
    getTranslations("Nav"),
    getBrand(),
  ]);
  const values = { serviceCharge: brand.charges.serviceChargeBps / 100 };
  const items = QUESTIONS.map((key) => ({
    key,
    q: t(`items.${key}.q`),
    a: t(`items.${key}.a`, values),
  }));

  return (
    <>
      <Splash />
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
      <PageHeader tone="leaf" compact eyebrow={brand.name} title={t("title")}>
        <Button asChild variant="highlight" size="lg" className="intro-fade [--d:450ms]">
          <Link href="/contact" transitionTypes={CURTAIN}>
            {nav("contact")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl px-4 pt-14 pb-28 sm:px-6 lg:pt-20">
        <Accordion type="single" collapsible className="border-t-2 border-foreground">
          {items.map(({ key, q, a }, i) => (
            <AccordionItem key={key} value={key} data-reveal className="border-dashed">
              <AccordionTrigger className="items-center py-6 text-left font-display text-xl leading-snug font-normal transition-colors hover:text-primary hover:no-underline aria-expanded:text-primary sm:text-2xl">
                <span className="flex items-baseline gap-4 sm:gap-6">
                  <span
                    aria-hidden
                    className="w-9 shrink-0 font-poster text-2xl text-primary tabular-nums sm:w-12 sm:text-3xl"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{q}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-6 pl-13 text-base text-pretty text-muted-foreground sm:pl-18 sm:text-lg">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
