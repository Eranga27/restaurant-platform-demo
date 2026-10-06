import { ArrowDown } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/config/brand";
import { siteMedia } from "@/config/media";
import { Link } from "@/i18n/navigation";

import { HeaderTone } from "./header-tone";

/** Order in the hero's entrance (globals.css, .intro). */
const intro = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * The home page's opening: a full-screen photo under the transparent header,
 * the headline rising word by word, and a line of facts along the bottom.
 */
export async function Hero({ brand, branchNames }: { brand: Brand; branchNames: string[] }) {
  const t = await getTranslations("Home");
  const nav = await getTranslations("Nav");
  const facts = [
    t("highlightKitchens", { count: branchNames.length }),
    t("highlightHours"),
    t("highlightCash"),
    t("highlightHalal"),
  ];

  return (
    <section className="relative isolate -mt-18 flex min-h-[100svh] flex-col overflow-hidden surface-ink">
      <HeaderTone />
      <div className="hero-drift absolute inset-0 -z-10">
        <Image
          src={siteMedia.hero}
          alt={t("heroImageAlt")}
          fill
          priority
          fetchPriority="high"
          // Under a dark gradient, so lighter compression doesn't show.
          quality={60}
          sizes="100vw"
          className="animate-hero-settle object-cover"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_70%,transparent)_0%,color-mix(in_srgb,var(--foreground)_25%,transparent)_35%,color-mix(in_srgb,var(--foreground)_55%,transparent)_65%,var(--foreground)_100%)]"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pt-32 pb-8 sm:px-6 lg:px-8">
        <p
          className="intro font-mono text-[0.7rem] font-medium tracking-[0.22em] text-highlight uppercase"
          style={intro(0)}
        >
          {t("heroEyebrow", { tagline: brand.tagline, places: branchNames.join(" · ") })}
        </p>
        <h1 className="intro-words mt-6 max-w-[15ch] text-display-3xl text-balance">
          <SplitWords markup={t.markup("heroTitle", { em: (c) => `<em>${c}</em>` })} />
        </h1>
        <div className="mt-10 grid gap-8 md:grid-cols-[minmax(0,28rem)_auto] md:items-end md:justify-between">
          <p className="intro text-lg text-pretty opacity-85" style={intro(3)}>
            {t("heroSubtitle")}
          </p>
          <div className="intro flex flex-wrap gap-3" style={intro(4)}>
            <Button
              asChild
              size="lg"
              className="bg-highlight text-highlight-foreground hover:bg-highlight/90"
            >
              <Link href="/menu">{nav("orderNow")}</Link>
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
        </div>
        <div
          className="intro mt-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-current/15 pt-5 font-mono text-[0.68rem] tracking-[0.2em] uppercase opacity-80"
          style={intro(5)}
        >
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2">
                <span aria-hidden className="size-1 rounded-full bg-highlight" />
                {fact}
              </li>
            ))}
          </ul>
          <a href="#kitchen" className="inline-flex items-center gap-2 hover:opacity-100">
            {t("scroll")}
            <ArrowDown aria-hidden className="size-3.5 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}
