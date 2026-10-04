import { Banknote, CalendarDays, Clock, ShoppingBag, Store } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";

export async function Hero({ brand, branchCount }: { brand: Brand; branchCount: number }) {
  const t = await getTranslations("Home");
  const nav = await getTranslations("Nav");

  const highlights = [
    { icon: Store, label: t("highlightKitchens", { count: branchCount }) },
    { icon: Clock, label: t("highlightHours") },
    { icon: Banknote, label: t("highlightCash") },
    { icon: null, label: t("highlightHalal") },
  ];

  return (
    <section className="relative isolate flex min-h-[min(88svh,760px)] items-end overflow-hidden">
      <Image
        src={siteMedia.hero}
        alt={t("heroImageAlt")}
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="-z-10 animate-hero-settle object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/95 via-foreground/70 to-foreground/25"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pt-32 pb-12 sm:px-6 sm:pb-16 lg:pb-20">
        <div className="max-w-2xl text-white">
          <p className="mb-4 animate-in text-xs font-medium tracking-[0.2em] text-highlight uppercase duration-700 slide-in-from-bottom-2 sm:text-sm">
            {t("heroEyebrow", { tagline: brand.tagline })}
          </p>
          <h1 className="text-display-2xl text-balance text-white">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-xl text-lg text-pretty text-white/85">{t("heroSubtitle")}</p>

          <div className="mt-8 flex animate-in flex-wrap gap-3 duration-700 slide-in-from-bottom-3">
            <Button
              asChild
              size="lg"
              className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
            >
              <Link href="/menu">
                <ShoppingBag data-icon="inline-start" aria-hidden />
                {nav("orderNow")}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link href="/branches">
                <CalendarDays data-icon="inline-start" aria-hidden />
                {nav("bookTable")}
              </Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                {Icon ? (
                  <Icon aria-hidden className="size-4 text-highlight" />
                ) : (
                  <span aria-hidden className="size-1.5 rounded-full bg-highlight" />
                )}
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
