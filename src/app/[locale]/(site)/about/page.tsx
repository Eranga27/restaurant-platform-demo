import { ArrowRight, HandHeart, Leaf, Sun } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/site/eyebrow";
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
      <div className="mx-auto w-full max-w-7xl px-4 pt-14 pb-24 sm:px-6 lg:px-8 lg:pt-24 lg:pb-32">
        <PageHeader
          eyebrow={brand.name}
          title={t("title")}
          intro={<p className="font-display text-display-md text-foreground">{t("lead")}</p>}
          image={{ src: siteMedia.story }}
        />

        {/* The story, set like a magazine page: a drop cap, a readable measure, the way to order beside it. */}
        <div className="mt-6 grid grid-cols-1 gap-10 border-t pt-12 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16 lg:pt-16">
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <Ornament className="w-24" />
            <Button asChild size="lg">
              <Link href="/menu" transitionTypes={LAMP}>
                {nav("orderNow")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </aside>
          <div className="max-w-[38rem] space-y-6 text-lg leading-relaxed text-pretty text-foreground/85 lg:text-xl lg:leading-relaxed">
            <p data-reveal className="drop-cap">
              {t("p1")}
            </p>
            <p data-reveal>{t("p2")}</p>
            <p data-reveal>{t("p3")}</p>
          </div>
        </div>
      </div>

      <section aria-labelledby="values" className="sheet surface-lacquer">
        <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-28 sm:px-6 lg:px-8 lg:pt-28 lg:pb-36">
          <Eyebrow className="opacity-90">{brand.name}</Eyebrow>
          <h2 id="values" data-reveal="words" className="mt-5 text-display-xl">
            <SplitWords markup={t("valuesTitle").replace(/[<>]/g, "")} />
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {values.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                data-reveal
                className="space-y-4 border-t border-[var(--border)] pt-6"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className="font-display text-display-lg text-highlight italic tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon aria-hidden className="size-6 opacity-80" />
                </div>
                <h3 className="font-display text-2xl">{title}</h3>
                <p className="text-pretty opacity-85">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
