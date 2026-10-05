import { ArrowRight, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { BranchFinder } from "@/components/home/branch-finder";
import { Hero } from "@/components/home/hero";
import { SectionHeading } from "@/components/home/section-heading";
import { DishCard } from "@/components/site/dish-card";
import { JsonLd } from "@/components/site/json-ld";
import { StarRating } from "@/components/site/star-rating";
import { Button } from "@/components/ui/button";
import { siteMedia } from "@/config/media";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBrand } from "@/lib/data/brand";
import { getBranches, getPromotions, getReviews, getSignatureItems } from "@/lib/data/catalogue";
import { pageMetadata } from "@/lib/seo";
import { restaurantJsonLd } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

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

const OFFER_TONES = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-highlight text-highlight-foreground",
  "bg-card text-card-foreground border",
];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = (await params).locale as Locale;
  const [t, tc, brand, branches, signatures, promotions, reviews] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Common"),
    getBrand(),
    getBranches(locale),
    getSignatureItems(locale),
    getPromotions(locale),
    getReviews(locale),
  ]);

  return (
    <>
      <JsonLd data={restaurantJsonLd(brand, branches, getPathname({ locale, href: "/menu" }))} />
      <Hero brand={brand} branchCount={branches.length} />

      <section
        aria-labelledby="signatures"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24"
      >
        <SectionHeading
          id="signatures"
          title={t("signatureTitle")}
          subtitle={t("signatureSubtitle")}
          action={
            <Button asChild variant="outline">
              <Link href="/menu">
                {t("viewFullMenu")}
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Link>
            </Button>
          }
        />
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {signatures.map((item) => (
            <li key={item.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <DishCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      {promotions.length > 0 && (
        <section aria-labelledby="offers" className="bg-muted/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading id="offers" title={t("offersTitle")} />
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promotions.slice(0, 3).map((promo, i) => (
                <li
                  key={promo.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-2xl p-6 shadow-soft",
                    OFFER_TONES[i % OFFER_TONES.length],
                  )}
                >
                  <h3 className="font-display text-2xl">{promo.title}</h3>
                  {promo.body && <p className="text-pretty opacity-90">{promo.body}</p>}
                  {promo.ctaHref && promo.ctaLabel && (
                    <Link
                      href={promo.ctaHref}
                      className="mt-auto inline-flex items-center gap-1.5 pt-2 font-semibold underline-offset-4 hover:underline"
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
        aria-labelledby="branches"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24"
      >
        <SectionHeading
          id="branches"
          title={t("branchesTitle")}
          subtitle={t("branchesSubtitle")}
          action={
            <Link
              href="/branches"
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              {t("allBranches")}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          }
        />
        <BranchFinder
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
        <section aria-labelledby="reviews" className="bg-secondary text-secondary-foreground">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 id="reviews" className="mb-8 text-display-lg">
              {t("reviewsTitle")}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {reviews.slice(0, 3).map((review) => (
                <li key={review.id}>
                  <figure className="flex h-full flex-col gap-4 rounded-2xl bg-card p-6 text-card-foreground shadow-soft">
                    <StarRating
                      rating={review.rating}
                      label={tc("rating", { rating: review.rating })}
                    />
                    <blockquote className="flex-1 text-pretty">“{review.body}”</blockquote>
                    <figcaption className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{review.authorName}</span>
                      {review.branchName && <> · {review.branchName}</>}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section
        aria-labelledby="story"
        className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:py-24"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-lifted md:order-2">
          <Image
            src={siteMedia.story}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-5">
          <h2 id="story" className="text-display-lg text-balance text-primary">
            {t("storyTitle")}
          </h2>
          <p className="text-lg text-pretty text-muted-foreground">{t("storyBody")}</p>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">
              {t("storyCta")}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="events" className="relative isolate overflow-hidden">
        <Image src={siteMedia.events} alt="" fill sizes="100vw" className="-z-10 object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-primary/85" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 py-16 text-primary-foreground sm:px-6 lg:py-24">
          <PartyPopper aria-hidden className="size-8 text-highlight" />
          <h2 id="events" className="max-w-2xl text-display-lg text-balance">
            {t("eventsTitle")}
          </h2>
          <p className="max-w-2xl text-lg text-pretty text-primary-foreground/85">
            {t("eventsBody")}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
          >
            <Link href="/events">{t("eventsCta")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
