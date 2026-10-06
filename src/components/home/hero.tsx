import { ArrowRight, Banknote, Bike, Leaf, Plus, Star } from "lucide-react";
import Image, { getImageProps } from "next/image";
import { getTranslations } from "next-intl/server";

import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { HERO_PORTRAIT_MEDIA, type HeroVideo, siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";
import type { MenuItemView } from "@/lib/data/catalogue";
import type { OpeningHours } from "@/lib/hours";
import { formatLKR } from "@/lib/money";

import { DishImage } from "@/components/site/dish-image";
import { HeroScene } from "./hero-scene";
import { OpenNowBadge } from "./open-now-badge";

/** The video's first frame, cut for the screen like the video itself. */
function VideoPoster({ video, alt }: { video: HeroVideo; alt: string }) {
  const common = { alt, sizes: "100vw", quality: 75 };
  const { portrait: tall, landscape: wide } = video;
  const {
    props: { srcSet: portrait },
  } = getImageProps({ ...common, src: tall.poster, width: tall.width, height: tall.height });
  const { props: landscape } = getImageProps({
    ...common,
    src: wide.poster,
    width: wide.width,
    height: wide.height,
    loading: "eager",
    fetchPriority: "high",
  });
  return (
    <picture>
      <source media={HERO_PORTRAIT_MEDIA} srcSet={portrait} sizes="100vw" />
      <img {...landscape} alt={alt} className="absolute inset-0 size-full object-cover" />
    </picture>
  );
}

/**
 * The home page's opening: the kitchen video filling the first screen, with
 * whether the kitchens are open right now, the promise, the two ways in
 * (order, book), the reasons to order now (rating, free delivery, cash on
 * delivery) and, on large screens, tonight's chef's pick ready to add.
 */
export async function Hero({
  brand,
  branchNames,
  hours,
  rating,
  reviewCount,
  pick,
}: {
  brand: Brand;
  branchNames: string[];
  /** Every branch's opening hours, for the "Open now" badge. */
  hours: OpeningHours[];
  /** Average guest rating, e.g. "4.7", or null without reviews. */
  rating: string | null;
  reviewCount: number;
  /** A dish to feature beside the headline, or null. */
  pick: MenuItemView | null;
}) {
  const t = await getTranslations("Home");
  const nav = await getTranslations("Nav");
  const video = siteMedia.heroVideo;
  const freeAbove = brand.charges.delivery.freeAboveCents;
  const proof = [
    rating && { icon: Star, text: t("heroRating", { rating, count: reviewCount }) },
    brand.features.delivery &&
      freeAbove !== null && {
        icon: Bike,
        text: t("heroFreeDelivery", { amount: formatLKR(freeAbove, { whole: true }) }),
      },
    brand.features.cashOnDelivery && { icon: Banknote, text: t("highlightCash") },
    { icon: Leaf, text: t("highlightHalal") },
  ].filter((item) => !!item);

  return (
    <HeroScene
      video={video}
      labels={{ play: t("playVideo"), pause: t("pauseVideo") }}
      poster={
        video ? (
          <VideoPoster video={video} alt={t("heroVideoAlt")} />
        ) : (
          <Image
            src={siteMedia.hero}
            alt={t("heroImageAlt")}
            fill
            preload
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        )
      }
    >
      <section
        id="welcome"
        aria-labelledby="welcome-title"
        className="mx-auto grid w-full max-w-7xl items-end gap-10 px-4 pt-36 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-8 lg:pb-16"
      >
        <div>
          <OpenNowBadge hours={hours} className="mb-6" />
          <p className="intro-fade flex items-center gap-2.5 text-sm font-medium tracking-wide text-highlight">
            <span aria-hidden className="size-1.5 rotate-45 bg-current" />
            {t("heroEyebrow", { tagline: brand.tagline, places: branchNames.join(" · ") })}
          </p>
          <h1
            id="welcome-title"
            className="intro-words mt-5 max-w-[14ch] font-display text-display-3xl text-balance"
          >
            <SplitWords markup={t.markup("heroTitle", { em: (c) => `<em>${c}</em>` })} />
          </h1>
          <p className="intro-fade mt-6 max-w-xl text-lg text-pretty opacity-90 [--d:450ms]">
            {t("heroSubtitle")}
          </p>
          <div className="intro-fade mt-8 flex flex-wrap gap-3 [--d:550ms]">
            <Button
              asChild
              size="lg"
              className="group bg-highlight text-highlight-foreground hover:bg-highlight/90"
            >
              <Link href="/menu">
                {nav("orderNow")}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-current/40 bg-transparent text-current hover:bg-white/10 hover:text-current"
            >
              <Link href="/reservations">{nav("bookTable")}</Link>
            </Button>
          </div>
          <ul className="intro-fade mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-current/20 pt-6 text-sm [--d:650ms]">
            {proof.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 opacity-90">
                <Icon aria-hidden className="size-4 text-highlight" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        {pick && (
          <Link
            href={{ pathname: "/menu", query: { item: pick.slug } }}
            className="intro-fade group hidden overflow-hidden rounded-2xl border border-current/15 bg-black/30 backdrop-blur-md transition-[translate,background-color] duration-300 [--d:850ms] hover:-translate-y-1 hover:bg-black/40 active:scale-[0.98] lg:block"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <DishImage
                src={pick.imageUrl}
                alt={pick.name}
                sizes="20rem"
                className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
              />
            </div>
            <div className="space-y-3 p-5">
              <p className="text-xs font-semibold tracking-[0.16em] text-highlight uppercase">
                {t("chefsPick")}
              </p>
              <p className="font-display text-2xl leading-tight">{pick.name}</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold tabular-nums">
                  {formatLKR(pick.basePriceCents, { whole: true })}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-3.5 py-1.5 text-sm font-semibold text-highlight-foreground">
                  <Plus aria-hidden className="size-3.5" />
                  {t("addDish")}
                </span>
              </div>
            </div>
          </Link>
        )}
      </section>
    </HeroScene>
  );
}
