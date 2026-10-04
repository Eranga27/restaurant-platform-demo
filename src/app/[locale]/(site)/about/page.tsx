import { HandHeart, Leaf, Sun } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { pageMetadata } from "@/lib/seo";

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
  const [t, nav] = await Promise.all([getTranslations("About"), getTranslations("Nav")]);
  const values = [
    { icon: Sun, title: t("value1Title"), body: t("value1Body") },
    { icon: Leaf, title: t("value2Title"), body: t("value2Body") },
    { icon: HandHeart, title: t("value3Title"), body: t("value3Body") },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
      <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <h1 className="text-display-xl text-primary">{t("title")}</h1>
          <p className="font-display text-2xl text-pretty text-foreground">{t("lead")}</p>
          <p className="text-lg text-pretty text-foreground/85">{t("p1")}</p>
          <p className="text-lg text-pretty text-foreground/85">{t("p2")}</p>
          <p className="text-lg text-pretty text-foreground/85">{t("p3")}</p>
          <Button asChild size="lg">
            <Link href="/menu">{nav("orderNow")}</Link>
          </Button>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lifted">
          <Image
            src={siteMedia.story}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <section aria-labelledby="values" className="mt-20">
        <h2 id="values" className="mb-8 text-display-lg text-primary">
          {t("valuesTitle")}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {values.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-3 rounded-2xl border bg-card p-6 shadow-soft">
              <Icon aria-hidden className="size-6 text-secondary" />
              <h3 className="font-display text-xl">{title}</h3>
              <p className="text-pretty text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
