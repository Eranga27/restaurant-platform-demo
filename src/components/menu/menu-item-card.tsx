"use client";

import { Flame, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { DietaryBadge } from "@/components/site/dietary-badge";
import { DishImage } from "@/components/site/dish-image";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ItemAvailability = "available" | "sold-out" | "not-today";

/**
 * Tile colours, in turn, like the bands of turned lacquer (globals.css,
 * .dish-tile). Three of them, so rows of two or four fall on the diagonal.
 */
const TONES = ["highlight", "secondary", "primary"] as const;

/**
 * A dish on the menu as a tile (docs/DECISIONS.md D114): the photo on a round
 * plate over a wash of a lacquer colour, a price sticker on the plate's edge,
 * then the name, a line about it, its marks and a "+" that opens it. The
 * whole tile is clickable through the heading's button (stretched with
 * ::after), so the dish name stays a real heading.
 */
export function MenuItemCard({
  item,
  priceCents,
  availability,
  onOpen,
  index = 0,
}: {
  item: MenuItemView;
  priceCents: number;
  availability: ItemAvailability;
  onOpen: () => void;
  /** Its place in the category, for the tile's colour. */
  index?: number;
}) {
  const t = useTranslations("Menu");
  const dietary = useTranslations("Dietary");
  const unavailable = availability !== "available";

  return (
    <article
      data-tone={TONES[index % TONES.length]}
      data-unavailable={unavailable || undefined}
      className="dish-tile group relative flex h-full flex-col rounded-[1.5rem] bg-card shadow-soft ring-1 ring-border/70 focus-within:ring-2 focus-within:ring-ring sm:rounded-[1.75rem]"
    >
      <div className="dish-tile-wash relative rounded-t-[inherit] px-5 pt-5 pb-3 sm:px-7 sm:pt-7">
        <div className="dish-tile-plate relative mx-auto aspect-square w-full max-w-[14rem]">
          <div className="dish-tile-photo">
            <DishImage
              src={item.imageUrl}
              alt=""
              sizes="(min-width: 1280px) 14rem, (min-width: 768px) 30vw, 45vw"
              className="transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.08]"
            />
          </div>
          <span
            className={cn(
              "dish-tile-price font-poster tabular-nums",
              unavailable && "line-through decoration-2",
            )}
          >
            {formatLKR(priceCents, { whole: true })}
          </span>
          {availability === "sold-out" && (
            <span className="dish-tile-flag bg-destructive text-white">{t("soldOut")}</span>
          )}
          {availability === "not-today" && (
            <span className="dish-tile-flag bg-foreground text-background">{t("notToday")}</span>
          )}
          {item.isSignature && availability === "available" && (
            <span className="dish-tile-flag bg-highlight text-highlight-foreground">
              {t("signature")}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4 sm:px-5 sm:pb-5">
        <h3 className="font-display text-base leading-snug sm:text-xl">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "text-left outline-none after:absolute after:inset-0 after:rounded-[inherit]",
              "transition-colors group-hover:text-primary",
              unavailable && "text-foreground/60",
            )}
          >
            {item.name}
          </button>
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground max-sm:hidden">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {item.spiceSelectable && (
              <span className="inline-flex items-center text-spice-hot" title={t("spiceChoice")}>
                <Flame aria-hidden className="size-3.5" fill="currentColor" />
                <span className="sr-only">{t("spiceChoice")}</span>
              </span>
            )}
            {item.dietaryTags.map((tag) => (
              <DietaryBadge
                key={tag}
                tag={tag}
                label={dietary(tag)}
                className="max-sm:px-1.5 max-sm:text-[0.7rem]"
              />
            ))}
          </div>
          {!unavailable && (
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[scale,rotate,background-color] duration-300 group-hover:scale-110 group-hover:rotate-90 sm:size-10"
            >
              <Plus className="size-4" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
