import { ArrowRight, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { DishImage } from "@/components/site/dish-image";
import { Eyebrow } from "@/components/site/eyebrow";
import { SplitWords } from "@/components/site/split-words";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { CURTAIN, LAMP } from "@/lib/transitions";

import { PlateTrack } from "./plate-track";

/** Disc colours, in turn, like the bands of turned lacquer. */
const TONES = ["highlight", "secondary", "primary", "foreground"] as const;

/**
 * Bestsellers as plates on lacquer discs (globals.css, .plates): each dish
 * sits in a round frame on a disc of a brand colour, its category and name
 * running round the rim, a price sticker on the edge and "Add" below. On
 * large screens the section is pinned and the row slides sideways as the page
 * scrolls; elsewhere it scrolls sideways by hand, snapping to each plate.
 */
export async function Plates({
  items,
  categoryNames,
  title,
}: {
  items: MenuItemView[];
  /** categoryId → name, for the words round the rim. */
  categoryNames: Record<string, string>;
  /** The section title with <em> accents, as markup. */
  title: string;
}) {
  const t = await getTranslations("Home");
  return (
    <section
      id="bestsellers"
      aria-labelledby="bestsellers-title"
      className="plates sheet bg-background"
    >
      <div className="plates-pin">
        <div className="plates-head mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <Eyebrow className="text-primary">{t("bestsellersLabel")}</Eyebrow>
            <h2 id="bestsellers-title" data-reveal="words" className="text-display-xl text-balance">
              <SplitWords markup={title} />
            </h2>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/menu" transitionTypes={CURTAIN}>
              {t("viewFullMenu")}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>
        <PlateTrack>
          {items.map((item, i) => {
            // Round the whole rim: twice when short, once when long (it's spaced to fit either way).
            const once = `${categoryNames[item.categoryId] ?? ""} ◆ ${item.name} ◆ `;
            const rim = once.length > 34 ? once : once.repeat(2);
            return (
              <li key={item.id} className="plate" data-tone={TONES[i % TONES.length]}>
                <Link
                  href={{ pathname: "/menu", query: { item: item.slug } }}
                  transitionTypes={LAMP}
                  className="plate-link group"
                >
                  <div className="plate-disc">
                    <svg aria-hidden viewBox="0 0 300 300" className="plate-rim">
                      <defs>
                        <path
                          id={`rim-${item.id}`}
                          d="M150,150 m-132,0 a132,132 0 1,1 264,0 a132,132 0 1,1 -264,0"
                        />
                      </defs>
                      <text>
                        <textPath href={`#rim-${item.id}`} textLength={829} lengthAdjust="spacing">
                          {rim}
                        </textPath>
                      </text>
                    </svg>
                    <div className="plate-photo">
                      <DishImage
                        src={item.imageUrl}
                        alt=""
                        sizes="(min-width: 1024px) 20rem, 70vw"
                        className="transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.07]"
                      />
                    </div>
                    <span className="plate-price font-poster">
                      {formatLKR(item.basePriceCents, { whole: true })}
                    </span>
                  </div>
                  <div className="plate-text">
                    <h3 className="font-display text-2xl leading-tight">{item.name}</h3>
                    <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                      {item.description}
                    </p>
                    <span className="plate-add">
                      <Plus aria-hidden className="size-4" />
                      {t("addDish")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </PlateTrack>
      </div>
    </section>
  );
}
