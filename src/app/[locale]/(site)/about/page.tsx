import { ArrowRight, HandHeart, Leaf, Sun } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/site/eyebrow";
import { Kolam } from "@/components/site/kolam";
import { Ornament } from "@/components/site/ornament";
import { PageHeader } from "@/components/site/page-header";
import { Splash } from "@/components/site/splash";
import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";
import { LAMP } from "@/lib/transitions";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/about">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/about",
    title: t("aboutTitle"),
    description: t("aboutDescription", { name: brand.name }),
  });
}

/** The values, each on a lacquer colour, pinned up at slight angles. */
const VALUE_TONES = [
  "bg-highlight text-highlight-foreground",
  "bg-primary text-primary-foreground",
  "bg-background text-foreground",
] as const;

export default async function AboutPage() {
  const [t, nav, brand] = await Promise.all([
    getTranslations("About"),
    getTranslations("Nav"),
    getBrand(),
  ]);
  const values = [
    { icon: Sun, title: t("value1Title"), body: t("value1Body") },
    { icon: Leaf, title: t("value2Title"), body: t("value2Body") },
    { icon: HandHeart, title: t("value3Title"), body: t("value3Body") },
  ];

  return (
    <>
      <Splash />
      <PageHeader
        tone="lacquer"
        eyebrow={brand.name}
        title={t("title")}
        intro={<p className="font-display text-display-md">{t("lead")}</p>}
        image={{ src: siteMedia.story }}
        band={values.map((v) => v.title)}
      />

      {/* The story, set like a magazine page, beside a plate that turns as it scrolls by. */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-24 pb-32 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:px-8 lg:pt-32 lg:pb-40">
        <aside className="order-last space-y-8 lg:sticky lg:top-28 lg:order-none lg:self-start">
          <div className="relative mx-auto aspect-square w-full max-w-[22rem] lg:mx-0">
            <div className="absolute -inset-4 rounded-full border border-dashed border-[color-mix(in_srgb,var(--primary)_45%,transparent)]" />
            <div className="turn-with-scroll absolute inset-0 overflow-hidden rounded-full bg-primary shadow-lifted">
              <Image
                src={siteMedia.hero}
                alt=""
                fill
                sizes="(min-width: 1024px) 22rem, 80vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Ornament className="w-24" />
            <Button asChild size="lg">
              <Link href="/menu" transitionTypes={LAMP}>
                {nav("orderNow")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </div>
        </aside>
        <div className="max-w-[38rem] space-y-7 text-lg leading-relaxed text-pretty text-foreground/85 lg:text-xl lg:leading-relaxed">
          <p data-reveal className="drop-cap">
            {t("p1")}
          </p>
          <p data-reveal>{t("p2")}</p>
          <p data-reveal>{t("p3")}</p>
        </div>
      </div>

      <section aria-labelledby="values" className="sheet overflow-hidden surface-leaf">
        <Kolam
          size={7}
          className="pointer-events-none absolute -bottom-28 -left-28 w-[28rem] text-highlight opacity-10"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pt-20 pb-32 sm:px-6 lg:px-8 lg:pt-28 lg:pb-40">
          <Eyebrow className="opacity-90">{brand.name}</Eyebrow>
          <h2 id="values" data-reveal="words" className="mt-5 text-display-2xl">
            <SplitWords markup={t("valuesTitle").replace(/[<>]/g, "")} />
          </h2>
          <ol className="mt-14 grid gap-6 md:grid-cols-3 lg:mt-16">
            {values.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                data-reveal
                className={`offer-card flex flex-col gap-4 rounded-[1.75rem] p-7 shadow-lifted ${VALUE_TONES[i % VALUE_TONES.length]}`}
              >
                <div className="flex items-start justify-between">
                  <span aria-hidden className="font-poster text-6xl leading-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon aria-hidden className="size-7 opacity-80" />
                </div>
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="text-pretty opacity-90">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
