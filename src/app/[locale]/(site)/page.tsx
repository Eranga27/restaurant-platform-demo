import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { BranchesMap } from "@/components/home/branches-map";
import { Hero } from "@/components/home/hero";
import { ReviewCarousel } from "@/components/home/review-carousel";
import { DishCard } from "@/components/site/dish-card";
import { Eyebrow } from "@/components/site/eyebrow";
import { JsonLd } from "@/components/site/json-ld";
import { Kolam } from "@/components/site/kolam";
import { Splash } from "@/components/site/splash";
import { SplitWords } from "@/components/site/split-words";
import { StarRating } from "@/components/site/star-rating";
import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, getPromotions, getReviews, getSignatureItems } from "@/lib/data/catalogue";
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

/** What sets the kitchen apart, in the order a guest would care about it. */
const REASONS = ["Spices", "Coconut", "Delivery"] as const;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, te, tc, brand, branches, signatures, promotions, reviews] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Events"),
    getTranslations("Common"),
    getBrand(),
    getBranches(locale),
    getSignatureItems(locale),
    getPromotions(locale),
    getReviews(locale),
  ]);
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const rating = reviews.length ? average.toFixed(1) : null;

  return (
    <>
      <Splash />
      <JsonLd data={restaurantJsonLd(brand, branches, getPathname({ locale, href: "/menu" }))} />
      <Hero
        brand={brand}
        branchNames={branches.map((b) => b.name)}
        rating={rating}
        reviewCount={reviews.length}
      />

      <section
        id="bestsellers"
        aria-labelledby="bestsellers-title"
        className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 lg:mb-14">
          <div className="max-w-2xl space-y-4">
            <Eyebrow className="text-primary">{t("bestsellersLabel")}</Eyebrow>
            <h2 id="bestsellers-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t.markup("signatureTitle", em)} />
            </h2>
            <p className="text-lg text-muted-foreground">{t("signatureSubtitle")}</p>
          </div>
          <Button asChild variant="outline" size="lg" className="group">
            <Link href="/menu">
              {t("viewFullMenu")}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {signatures.map((item, i) => (
            <li
              key={item.id}
              data-reveal
              style={{ "--reveal-delay": `${(i % 3) * 80}ms` } as React.CSSProperties}
            >
              <DishCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section id="why" aria-labelledby="why-title" className="scroll-mt-24 surface-ink">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 lg:gap-20 lg:px-8 lg:py-28">
          <div
            data-reveal="zoom"
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 md:aspect-[4/5]"
          >
            <div className="parallax absolute inset-x-0 -inset-y-[8%]">
              <Image
                src={siteMedia.hero}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="space-y-8">
            <Eyebrow className="text-highlight">{t("whyLabel")}</Eyebrow>
            <h2 id="why-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t.markup("whyTitle", em)} />
            </h2>
            <ol className="space-y-6">
              {REASONS.map((reason, i) => (
                <li
                  key={reason}
                  data-reveal
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-[var(--border)] pt-6"
                >
                  <span
                    aria-hidden
                    className="font-display text-2xl text-highlight italic tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl">{t(`why${reason}Title`)}</h3>
                    <p className="text-pretty opacity-80">{t(`why${reason}Body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 font-medium text-highlight underline-offset-4 hover:underline"
            >
              {t("storyCta")}
              <ArrowUpRight aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {promotions.length > 0 && (
        <section
          id="offers"
          aria-labelledby="offers-title"
          className="relative scroll-mt-24 overflow-hidden surface-lacquer"
        >
          <Kolam
            size={7}
            className="pointer-events-none absolute -top-28 -right-28 w-[28rem] text-highlight opacity-15"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <Eyebrow className="opacity-90">{t("offersLabel")}</Eyebrow>
            <h2 id="offers-title" data-reveal="words" className="mt-5 text-display-xl">
              <SplitWords markup={t.markup("offersTitle", { ...em, name: brand.name })} />
            </h2>
            <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promotions.slice(0, 3).map((promo) => (
                <li
                  key={promo.id}
                  data-reveal
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-black/10 p-6 backdrop-blur-sm"
                >
                  <h3 className="font-display text-display-md">{promo.title}</h3>
                  {promo.body && <p className="text-pretty opacity-85">{promo.body}</p>}
                  {promo.ctaHref && promo.ctaLabel && (
                    <Link
                      href={promo.ctaHref}
                      className="mt-auto inline-flex items-center gap-2 self-start rounded-full bg-highlight px-5 py-2.5 text-sm font-semibold text-highlight-foreground transition-colors hover:bg-highlight/90"
                    >
                      {promo.ctaLabel}
                      <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section
        id="branches"
        aria-labelledby="branches-title"
        className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl space-y-4">
            <Eyebrow className="text-primary">{t("branchesLabel")}</Eyebrow>
            <h2 id="branches-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={t.markup("branchesTitle", em)} />
            </h2>
            <p className="text-lg text-muted-foreground">
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
          aria-labelledby="guests-title"
          className="scroll-mt-24 bg-secondary text-secondary-foreground"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-20 [--em-color:var(--highlight)] sm:px-6 lg:px-8 lg:py-28">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-4">
                <Eyebrow className="opacity-90">{t("guestsLabel")}</Eyebrow>
                <h2 id="guests-title" data-reveal="words" className="text-display-xl">
                  <SplitWords markup={t.markup("reviewsTitle", em)} />
                </h2>
              </div>
              <div data-reveal className="flex items-center gap-4">
                <span className="font-display text-display-xl leading-none">{rating}</span>
                <span className="space-y-1">
                  <StarRating
                    rating={Math.round(average)}
                    label={tc("rating", { rating: rating ?? "" })}
                  />
                  <span className="block text-sm opacity-80">
                    {t("ratingCount", { count: reviews.length })}
                  </span>
                </span>
              </div>
            </div>
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
        id="events"
        aria-labelledby="events-title"
        className="relative isolate scroll-mt-24 overflow-hidden surface-ink"
      >
        <div className="parallax absolute inset-x-0 -inset-y-[12%] -z-10">
          <Image src={siteMedia.events} alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_92%,transparent)_0%,color-mix(in_srgb,var(--foreground)_70%,transparent)_100%)]"
        />
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <Eyebrow className="text-highlight">{t("eventsLabel")}</Eyebrow>
          <h2
            id="events-title"
            data-reveal="words"
            className="mt-5 max-w-3xl text-display-2xl text-balance"
          >
            <SplitWords markup={t.markup("eventsTitle", em)} />
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,32rem)_auto] md:items-end md:justify-between">
            <div className="space-y-6">
              <p className="text-lg text-pretty opacity-85">{t("eventsBody")}</p>
              <ul className="flex flex-wrap gap-2">
                {(["birthday", "office", "dana", "wedding", "homecoming"] as const).map((type) => (
                  <li
                    key={type}
                    className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-sm"
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
    </>
  );
}
