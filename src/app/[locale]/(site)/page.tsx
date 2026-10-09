import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { BranchesMap } from "@/components/home/branches-map";
import { Hero } from "@/components/home/hero";
import { LacquerBand } from "@/components/home/lacquer-band";
import { Plates } from "@/components/home/plates";
import { ReviewWall } from "@/components/home/review-wall";
import { StickyOrderBar } from "@/components/home/sticky-order-bar";
import { Eyebrow } from "@/components/site/eyebrow";
import { JsonLd } from "@/components/site/json-ld";
import { Kolam } from "@/components/site/kolam";
import { Splash } from "@/components/site/splash";
import { SplitWords } from "@/components/site/split-words";
import { StarRating } from "@/components/site/star-rating";
import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { loadMessages } from "@/i18n/messages";
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
import { CURTAIN, LAMP } from "@/lib/transitions";

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

/** What sets the kitchen apart, in the order a guest would care about it, each on a lacquer colour. */
const REASONS = [
  { key: "Spices", tone: "bg-highlight text-highlight-foreground" },
  { key: "Coconut", tone: "bg-secondary text-secondary-foreground" },
  { key: "Delivery", tone: "bg-primary text-primary-foreground" },
] as const;

/** Plates in the bestsellers row. */
const PLATES = 9;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, te, tc, nav, brand, branches, signatures, promotions, reviews, menu, ...languages] =
    await Promise.all([
      getTranslations("Home"),
      getTranslations("Events"),
      getTranslations("Common"),
      getTranslations("Nav"),
      getBrand(),
      getBranches(locale),
      getSignatureItems(locale),
      getPromotions(locale),
      getReviews(locale),
      getMenu(locale),
      loadMessages("en"),
      loadMessages("si"),
      loadMessages("ta"),
    ]);
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const rating = reviews.length ? average.toFixed(1) : null;

  // The plates: photographed bestsellers first, then more photographed dishes.
  const pictured = signatures.filter((i) => i.imageUrl);
  const more = menu.categories
    .flatMap((c) => c.items)
    .filter((i) => i.imageUrl && !i.isAlcohol && !pictured.some((p) => p.id === i.id));
  const plates = [...pictured, ...more].slice(0, PLATES);
  const categoryNames = Object.fromEntries(menu.categories.map((c) => [c.id, c.name]));

  // The bands speak like a Sri Lankan street sign: each dish in English, Sinhala and Tamil.
  const [en, si, ta] = languages.map((m) => m.Splash.words.split("|"));
  const dishWords = en!.flatMap((word, i) =>
    [word, si![i], ta![i]].filter((w): w is string => !!w),
  );

  return (
    <>
      <Splash />
      <JsonLd data={restaurantJsonLd(brand, branches, getPathname({ locale, href: "/menu" }))} />
      <Hero
        brand={brand}
        branchNames={branches.map((b) => b.name)}
        hours={branches.map((b) => b.openingHours)}
        rating={rating}
        reviewCount={reviews.length}
        pick={signatures.find((i) => i.imageUrl) ?? null}
      />

      <div className="band-cross">
        <LacquerBand words={dishWords} tone="saffron" />
        <LacquerBand words={menu.categories.map((c) => c.name)} tone="lacquer" reverse />
      </div>

      <Plates items={plates} categoryNames={categoryNames} title={t.markup("signatureTitle", em)} />

      <section id="why" aria-labelledby="why-title" className="sheet scroll-mt-24 surface-ink">
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <Eyebrow className="text-highlight">{t("whyLabel")}</Eyebrow>
          <h2 id="why-title" className="scrub mt-6 max-w-5xl text-display-3xl text-balance">
            <SplitWords markup={t.markup("whyTitle", em)} />
          </h2>
          <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:mt-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
              <div className="absolute -inset-4 rounded-full border border-dashed border-[color-mix(in_srgb,var(--highlight)_50%,transparent)]" />
              <div className="turn-with-scroll absolute inset-0 overflow-hidden rounded-full shadow-lifted ring-8 ring-[color-mix(in_srgb,var(--background)_10%,transparent)]">
                <Image
                  src={siteMedia.hero}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 26rem, 80vw"
                  className="object-cover"
                />
              </div>
            </div>
            <ol className="grid gap-4">
              {REASONS.map(({ key, tone }, i) => (
                <li
                  key={key}
                  data-reveal
                  className={`grid grid-cols-[auto_1fr] items-start gap-5 rounded-[1.75rem] p-6 sm:p-7 ${tone}`}
                >
                  <span aria-hidden className="font-poster text-5xl leading-none tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-2xl">{t(`why${key}Title`)}</h3>
                    <p className="text-pretty opacity-90">{t(`why${key}Body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <Link
            href="/about"
            transitionTypes={CURTAIN}
            className="mt-12 inline-flex items-center gap-1.5 link-sweep pb-0.5 font-medium text-highlight"
          >
            {t("storyCta")}
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>
      </section>

      {promotions.length > 0 && (
        <section
          id="offers"
          aria-labelledby="offers-title"
          className="sheet scroll-mt-24 overflow-hidden surface-lacquer"
        >
          <Kolam
            size={7}
            className="pointer-events-none absolute -top-28 -right-28 w-[28rem] text-highlight opacity-15"
          />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <Eyebrow className="opacity-90">{t("offersLabel")}</Eyebrow>
            <h2 id="offers-title" data-reveal="words" className="mt-5 text-display-2xl">
              <SplitWords markup={t.markup("offersTitle", { ...em, name: brand.name })} />
            </h2>
            <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {promotions.slice(0, 3).map((promo) => (
                <li
                  key={promo.id}
                  data-reveal
                  className="offer-card flex flex-col gap-4 rounded-[1.75rem] border border-[var(--border)] bg-black/10 p-7 backdrop-blur-sm hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--highlight)_45%,transparent)] hover:bg-black/15"
                >
                  <h3 className="font-display text-display-md">{promo.title}</h3>
                  {promo.body && <p className="text-pretty opacity-85">{promo.body}</p>}
                  {promo.ctaHref && promo.ctaLabel && (
                    <Button asChild variant="highlight" className="mt-auto self-start">
                      <Link href={promo.ctaHref} transitionTypes={LAMP}>
                        {promo.ctaLabel}
                        <ArrowRight aria-hidden className="size-4" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section
        id="events"
        aria-labelledby="events-title"
        className="sheet scroll-mt-24 surface-ink"
      >
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20 lg:px-8 lg:py-32">
          <div className="space-y-8">
            <Eyebrow className="text-highlight">{t("eventsLabel")}</Eyebrow>
            <h2 id="events-title" data-reveal="words" className="text-display-2xl text-balance">
              <SplitWords markup={t.markup("eventsTitle", em)} />
            </h2>
            <p className="max-w-xl text-lg text-pretty opacity-85">{t("eventsBody")}</p>
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
            <Button asChild size="lg" variant="highlight">
              <Link href="/events" transitionTypes={CURTAIN}>
                {t("eventsCta")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </div>
          <div
            data-reveal="image"
            className="arch relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-white/5"
          >
            <div className="parallax absolute inset-x-0 -inset-y-[8%]">
              <Image
                src={siteMedia.events}
                alt=""
                fill
                sizes="(min-width: 1024px) 28rem, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="branches"
        aria-labelledby="branches-title"
        className="sheet scroll-mt-24 bg-background"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
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
              transitionTypes={CURTAIN}
              className="inline-flex items-center gap-1.5 link-sweep pb-0.5 font-medium"
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
        </div>
      </section>

      {reviews.length > 0 && (
        <section
          id="guests"
          aria-labelledby="guests-title"
          className="sheet scroll-mt-24 surface-leaf"
        >
          <div className="mx-auto w-full max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-4">
                <Eyebrow className="opacity-90">{t("guestsLabel")}</Eyebrow>
                <h2 id="guests-title" data-reveal="words" className="text-display-2xl">
                  <SplitWords markup={t.markup("reviewsTitle", em)} />
                </h2>
              </div>
              <div data-reveal className="flex items-center gap-4">
                <span className="font-poster text-8xl leading-none">{rating}</span>
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
          </div>
          <div className="mx-auto mt-12 max-w-[100rem] px-4 pb-32 sm:px-6 lg:mt-16 lg:px-8 lg:pb-40">
            <ReviewWall
              reviews={reviews.slice(0, 8).map((r) => ({
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

      <StickyOrderBar watch="welcome" label={t("quickOrder")}>
        <Button asChild variant="highlight" className="h-11 flex-1">
          <Link href="/menu" transitionTypes={LAMP}>
            {nav("orderNow")}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-11 flex-1 border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
        >
          <Link href="/reservations" transitionTypes={CURTAIN}>
            {nav("bookTable")}
          </Link>
        </Button>
      </StickyOrderBar>
    </>
  );
}
