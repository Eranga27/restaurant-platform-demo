import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { BranchesMap } from "@/components/home/branches-map";
import { ChapterNav } from "@/components/home/chapter-nav";
import { Hero } from "@/components/home/hero";
import { ReviewCarousel } from "@/components/home/review-carousel";
import { SignatureRail } from "@/components/home/signature-rail";
import { DishCard } from "@/components/site/dish-card";
import { Eyebrow } from "@/components/site/eyebrow";
import { JsonLd } from "@/components/site/json-ld";
import { Kolam } from "@/components/site/kolam";
import { Marquee } from "@/components/site/marquee";
import { Splash } from "@/components/site/splash";
import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import {
  getBranches,
  getMenu,
  getPromotions,
  getReviews,
  getSignatureItems,
} from "@/lib/data/catalogue";
import { pageMetadata } from "@/lib/seo";
import { restaurantJsonLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const [t, brand] = await Promise.all([getTranslations("Metadata"), getBrand()]);
  return pageMetadata({
    locale,
    path: "/",
    title: t("homeTitle", { name: brand.name, tagline: brand.tagline }),
    description: t("homeDescription", { description: brand.description }),
    absoluteTitle: true,
  });
}

const em = { em: (chunks: string) => `<em>${chunks}</em>` };

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, te, brand, branches, signatures, promotions, reviews, menu] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Events"),
    getBrand(),
    getBranches(locale),
    getSignatureItems(locale),
    getPromotions(locale),
    getReviews(locale),
    getMenu(locale),
  ]);
  const dishCount = menu.categories.reduce((n, c) => n + c.items.length, 0);
  const rating = reviews.length
    ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  let chapter = 0;
  const next = () => ++chapter;

  return (
    <>
      <Splash />
      <JsonLd data={restaurantJsonLd(brand, branches, getPathname({ locale, href: "/menu" }))} />
      <Hero brand={brand} branchNames={branches.map((b) => b.name)} />

      <Marquee
        items={menu.categories.map((c) => c.name)}
        className="bg-highlight text-highlight-foreground"
      />

      <section
        id="kitchen"
        data-chapter={t("chapterKitchen")}
        aria-labelledby="kitchen-title"
        className="relative mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-36"
      >
        <Kolam
          size={7}
          className="pointer-events-none absolute top-24 right-8 hidden w-[24rem] text-primary opacity-[0.16] lg:block"
        />
        <Eyebrow index={next()} className="text-muted-foreground">
          {t("chapterKitchen")}
        </Eyebrow>
        <h2
          id="kitchen-title"
          data-reveal="words"
          className="mt-8 max-w-5xl font-display text-display-lg text-balance"
        >
          <SplitWords markup={t.markup("statement", em)} />
        </h2>
        <dl className="mt-16 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-current/10 bg-current/10">
          {[
            [String(branches.length), t("statKitchens")],
            [String(dishCount), t("statDishes")],
            rating ? [`${rating} ★`, t("statRating")] : [brand.hoursSummary, t("highlightHours")],
          ].map(([value, label]) => (
            <div key={label} data-reveal className="bg-background p-4 sm:p-8">
              <dt className="font-mono text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase sm:text-[0.7rem]">
                {label}
              </dt>
              <dd className="mt-3 font-display text-display-md">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="signatures"
        data-chapter={t("chapterSignatures")}
        aria-labelledby="signatures-title"
        className="scroll-mt-24 border-t border-current/10"
      >
        <SignatureRail
          header={
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl space-y-6">
                <Eyebrow index={next()} className="text-muted-foreground">
                  {t("chapterSignatures")}
                </Eyebrow>
                <h2
                  id="signatures-title"
                  data-reveal="words"
                  className="text-display-xl text-balance lg:text-display-lg"
                >
                  <SplitWords markup={t.markup("signatureTitle", em)} />
                </h2>
                <p className="text-muted-foreground">{t("signatureSubtitle")}</p>
              </div>
              <Button asChild variant="outline" size="lg">
                <Link href="/menu">{t("viewFullMenu")}</Link>
              </Button>
            </div>
          }
        >
          {signatures.map((item, i) => (
            // On large screens the row is pinned: cards scale with the screen's height.
            <li
              key={item.id}
              className="w-[78vw] shrink-0 snap-start sm:w-[22rem] lg:w-[min(24rem,34svh)]"
            >
              <DishCard item={item} index={i} />
            </li>
          ))}
        </SignatureRail>
      </section>

      {promotions.length > 0 && (
        <section
          id="offers"
          data-chapter={t("chapterOffers")}
          aria-labelledby="offers-title"
          className="relative scroll-mt-24 overflow-hidden surface-ink"
        >
          <Kolam
            size={7}
            className="pointer-events-none absolute -top-24 -left-24 w-[26rem] text-highlight opacity-10"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <Eyebrow index={next()} className="opacity-70">
              {t("chapterOffers")}
            </Eyebrow>
            <h2 id="offers-title" data-reveal="words" className="mt-8 text-display-xl">
              <SplitWords markup={t.markup("offersTitle", { ...em, name: brand.name })} />
            </h2>
            <ol className="mt-14 border-b border-[var(--border)]">
              {promotions.slice(0, 4).map((promo, i) => (
                <li
                  key={promo.id}
                  data-reveal
                  className="group grid gap-4 border-t border-[var(--border)] py-8 md:grid-cols-[4rem_1fr_auto] md:items-baseline md:gap-8"
                >
                  <span className="font-mono text-xs tracking-[0.2em] tabular-nums opacity-50">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-3">
                    <h3 className="font-display text-display-md transition-colors group-hover:text-highlight">
                      {promo.title}
                    </h3>
                    {promo.body && <p className="max-w-2xl text-pretty opacity-75">{promo.body}</p>}
                  </div>
                  {promo.ctaHref && promo.ctaLabel && (
                    <Link
                      href={promo.ctaHref}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium transition-colors hover:border-highlight hover:bg-highlight hover:text-highlight-foreground"
                    >
                      {promo.ctaLabel}
                      <ArrowUpRight aria-hidden className="size-4" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section
        id="branches"
        data-chapter={t("chapterBranches")}
        aria-labelledby="branches-title"
        className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-32"
      >
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl space-y-6">
            <Eyebrow index={next()} className="text-muted-foreground">
              {t("chapterBranches")}
            </Eyebrow>
            <h2 id="branches-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t.markup("branchesTitle", em)} />
            </h2>
            <p className="text-muted-foreground">
              {t("branchesSubtitle", { count: branches.length })}
            </p>
          </div>
          <Link
            href="/branches"
            className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          >
            {t("allBranches")}
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>
        <BranchesMap
          branches={branches.map((b) => ({
            id: b.id,
            name: b.name,
            addressLine: b.addressLine,
            city: b.city,
            lat: b.lat,
            lng: b.lng,
            phone: b.phone,
            openingHours: b.openingHours,
          }))}
        />
      </section>

      {reviews.length > 0 && (
        <section
          id="guests"
          data-chapter={t("chapterGuests")}
          aria-labelledby="guests-title"
          className="scroll-mt-24 bg-secondary text-secondary-foreground"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-24 [--em-color:var(--highlight)] sm:px-6 lg:px-8 lg:py-32">
            <Eyebrow index={next()} className="opacity-75">
              {t("chapterGuests")}
            </Eyebrow>
            <h2 id="guests-title" data-reveal="words" className="mt-8 mb-14 text-display-lg">
              <SplitWords markup={t.markup("reviewsTitle", em)} />
            </h2>
            <ReviewCarousel
              reviews={reviews.slice(0, 6).map((r) => ({
                id: r.id,
                body: r.body,
                rating: r.rating,
                authorName: r.authorName,
                branchName: r.branchName,
              }))}
            />
          </div>
        </section>
      )}

      <section
        id="story"
        data-chapter={t("chapterStory")}
        aria-labelledby="story-title"
        className="scroll-mt-24 surface-ink"
      >
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 lg:gap-20 lg:px-8 lg:py-32">
          <div
            data-reveal="zoom"
            className="relative aspect-[4/5] overflow-hidden rounded-md bg-white/5 md:order-2"
          >
            <div className="parallax absolute inset-x-0 -inset-y-[8%]">
              <Image
                src={siteMedia.story}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="space-y-8">
            <Eyebrow index={next()} className="opacity-70">
              {t("chapterStory")}
            </Eyebrow>
            <h2 id="story-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t.markup("storyTitle", em)} />
            </h2>
            <p className="max-w-lg text-lg text-pretty opacity-80">{t("storyBody")}</p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[var(--border)] bg-transparent text-current hover:bg-white/5 hover:text-current"
            >
              <Link href="/about">{t("storyCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section
        id="events"
        data-chapter={t("chapterEvents")}
        aria-labelledby="events-title"
        className="relative isolate scroll-mt-24 overflow-hidden surface-ink"
      >
        <div className="parallax absolute inset-x-0 -inset-y-[12%] -z-10">
          <Image src={siteMedia.events} alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[color-mix(in_srgb,var(--foreground)_78%,transparent)]"
        />
        <div className="mx-auto w-full max-w-7xl px-4 py-28 sm:px-6 lg:px-8 lg:py-40">
          <Eyebrow index={next()} className="opacity-70">
            {t("chapterEvents")}
          </Eyebrow>
          <h2
            id="events-title"
            data-reveal="words"
            className="mt-8 max-w-4xl text-display-2xl text-balance"
          >
            <SplitWords markup={t.markup("eventsTitle", em)} />
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-[minmax(0,32rem)_auto] md:items-end md:justify-between">
            <div className="space-y-6">
              <p className="text-lg text-pretty opacity-85">{t("eventsBody")}</p>
              <ul className="flex flex-wrap gap-2">
                {(["birthday", "office", "dana", "wedding", "homecoming"] as const).map((type) => (
                  <li
                    key={type}
                    className="rounded-full border border-[var(--border)] px-3.5 py-1.5 font-mono text-[0.68rem] tracking-[0.15em] uppercase"
                  >
                    {te(`types.${type}`)}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
            >
              <Link href="/events">{t("eventsCta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <ChapterNav />
    </>
  );
}
