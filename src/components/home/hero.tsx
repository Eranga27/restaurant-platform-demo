import Image, { getImageProps } from "next/image";
import { getTranslations } from "next-intl/server";

import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { HERO_PORTRAIT_MEDIA, type HeroVideo, siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";

import { HeroScene } from "./hero-scene";

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
 * The home page's opening: the kitchen video on its own under the
 * transparent header, then the headline, the two ways in and a line of facts
 * on a sheet of paper that slides up over it (HeroScene).
 */
export async function Hero({ brand, branchNames }: { brand: Brand; branchNames: string[] }) {
  const t = await getTranslations("Home");
  const nav = await getTranslations("Nav");
  const video = siteMedia.heroVideo;
  const facts = [
    t("highlightKitchens", { count: branchNames.length }),
    t("highlightHours"),
    t("highlightCash"),
    t("highlightHalal"),
  ];

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
      overlay={
        <a
          href="#welcome"
          className="group inline-flex items-center gap-4 font-mono text-[0.68rem] tracking-[0.22em] uppercase"
        >
          <span
            aria-hidden
            className="scroll-cue relative h-10 w-px overflow-hidden bg-current/30"
          />
          {t("scroll")}
        </a>
      }
    >
      <section
        id="welcome"
        aria-labelledby="welcome-title"
        className="relative z-10 rounded-t-[1.75rem] bg-background lg:rounded-t-[2.75rem]"
      >
        <div className="mx-auto w-full max-w-7xl px-4 pt-20 pb-20 sm:px-6 lg:px-8 lg:pt-32 lg:pb-28">
          <p
            data-reveal="fade"
            className="font-mono text-[0.7rem] font-medium tracking-[0.22em] text-primary uppercase"
          >
            {t("heroEyebrow", { tagline: brand.tagline, places: branchNames.join(" · ") })}
          </p>
          <h1
            id="welcome-title"
            data-reveal="words"
            className="mt-6 max-w-[15ch] font-display text-display-3xl text-balance"
          >
            <SplitWords markup={t.markup("heroTitle", { em: (c) => `<em>${c}</em>` })} />
          </h1>
          <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,28rem)_auto] md:items-end md:justify-between">
            <p data-reveal className="text-lg text-pretty text-muted-foreground">
              {t("heroSubtitle")}
            </p>
            <div data-reveal className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/menu">{nav("orderNow")}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/reservations">{nav("bookTable")}</Link>
              </Button>
            </div>
          </div>
          <ul
            data-reveal="fade"
            className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-current/12 pt-5 font-mono text-[0.68rem] tracking-[0.2em] text-muted-foreground uppercase"
          >
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <span aria-hidden className="size-1 rounded-full bg-primary" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </HeroScene>
  );
}
