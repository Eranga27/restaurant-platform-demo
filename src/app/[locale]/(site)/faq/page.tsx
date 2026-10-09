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
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-16 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:px-8 lg:pt-24">
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
        <div className="lg:sticky lg:top-28 lg:self-start">
          <PageHeader eyebrow={brand.name} title={t("title")}>
            <Button asChild variant="outline" size="lg" className="intro-fade [--d:450ms]">
              <Link href="/contact" transitionTypes={CURTAIN}>
                {nav("contact")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </PageHeader>
        </div>
        <Accordion type="single" collapsible className="border-t lg:mt-4">
          {items.map(({ key, q, a }) => (
            <AccordionItem key={key} value={key} data-reveal>
              <AccordionTrigger className="py-6 text-left font-display text-xl leading-snug font-normal transition-colors hover:text-primary hover:no-underline aria-expanded:text-primary sm:text-2xl">
                {q}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl pb-6 text-base text-pretty text-muted-foreground sm:text-lg">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
