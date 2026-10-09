import Image from "next/image";
import type { ReactNode } from "react";

import { HeaderTone } from "@/components/home/header-tone";
import { LacquerBand } from "@/components/home/lacquer-band";
import { SpinSticker } from "@/components/home/spin-sticker";
import { getBrand } from "@/lib/data/brand";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";
import { Kolam } from "./kolam";
import { SplitWords } from "./split-words";

/** "Get in touch" → "Get in <em>touch</em>": the last word as the italic accent. */
function accentLastWord(title: string): string {
  const escaped = title.replace(/[<>]/g, "");
  const at = escaped.lastIndexOf(" ");
  return at === -1
    ? `<em>${escaped}</em>`
    : `${escaped.slice(0, at + 1)}<em>${escaped.slice(at + 1)}</em>`;
}

const SURFACES = {
  lacquer: "surface-lacquer",
  leaf: "surface-leaf",
  ink: "surface-ink",
} as const;

export type PageTone = keyof typeof SURFACES;

/**
 * The top of a content page, a poster in one of the lacquer colours
 * (docs/DECISIONS.md D113): it runs under the header, which turns clear with
 * light text over it, like the home page's video. A short label, a big poster
 * title whose last word is the italic accent, rising word by word on arrival,
 * and an intro. With `image`, a photo stands beside it in a Kandyan arch or on
 * a plate, the turning sticker on its edge. With `band`, a lacquer band of
 * those words is laid over the seam with the page below. `compact` is a
 * shorter poster, for pages people come to for a task (checkout, policies).
 */
export async function PageHeader({
  tone = "lacquer",
  eyebrow,
  title,
  intro,
  image,
  band,
  compact = false,
  children,
  className,
}: {
  tone?: PageTone;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  /** A photo for the page. Decorative unless `alt` says otherwise. */
  image?: { src: string; alt?: string; shape?: "arch" | "plate" };
  /** Words for a band across the bottom (decorative, hidden from screen readers). */
  band?: string[];
  compact?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const brand = await getBrand();
  const plate = image?.shape === "plate";

  return (
    <>
      <div
        data-tone={tone}
        className={cn(
          "masthead relative isolate -mt-18 overflow-hidden",
          SURFACES[tone],
          className,
        )}
      >
        <HeaderTone />
        <Kolam
          size={9}
          className="pointer-events-none absolute -top-32 -right-32 -z-10 w-[36rem] text-highlight opacity-[0.09]"
        />
        <div
          className={cn(
            "mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:px-8",
            compact ? "pt-32 pb-14 lg:pt-36 lg:pb-16" : "pt-32 pb-16 lg:pt-36 lg:pb-20",
            band && (compact ? "pb-20 lg:pb-24" : "pb-24 lg:pb-28"),
            image &&
              "lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-center lg:gap-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,23rem)]",
          )}
        >
          <div className="max-w-5xl space-y-6">
            {eyebrow && <Eyebrow className="intro-fade [--d:0ms]">{eyebrow}</Eyebrow>}
            <h1
              className={cn(
                "intro-words text-balance",
                compact ? "text-display-2xl" : "text-display-3xl",
              )}
            >
              <SplitWords markup={accentLastWord(title)} />
            </h1>
            {intro && (
              <div className="intro-fade max-w-2xl text-lg text-pretty opacity-90 [--d:450ms]">
                {intro}
              </div>
            )}
            {children}
          </div>
          {image && (
            <div className="relative mr-2 ml-auto w-full max-w-[14rem] sm:max-w-xs lg:mx-0 lg:max-w-none">
              <div
                className={cn(
                  "intro-image relative overflow-hidden bg-white/5 shadow-lifted [--d:250ms]",
                  plate
                    ? "aspect-square rounded-full ring-[10px] ring-[color-mix(in_srgb,var(--background)_14%,transparent)]"
                    : "arch aspect-[4/5]",
                )}
              >
                <Image
                  src={image.src}
                  alt={image.alt ?? ""}
                  fill
                  preload
                  sizes="(min-width: 1280px) 23rem, 20rem"
                  className="object-cover"
                />
              </div>
              <div
                className={cn(
                  "intro-fade absolute w-24 [--d:700ms] sm:w-28 lg:w-36",
                  plate ? "-right-2 -bottom-2" : "-bottom-8 -left-8 lg:-left-14",
                )}
              >
                <SpinSticker
                  id="masthead-sticker"
                  text={`${brand.tagline} ◆ ${brand.name} ◆ `}
                  mark={brand.logo.mark}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {band && band.length > 0 && (
        <div className="band-seam">
          <LacquerBand words={band} tone={tone === "lacquer" ? "saffron" : "lacquer"} />
        </div>
      )}
    </>
  );
}
