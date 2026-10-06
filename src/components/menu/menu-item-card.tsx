"use client";

import { Flame, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { DietaryBadge } from "@/components/site/dietary-badge";
import { DishImage } from "@/components/site/dish-image";
import { Badge } from "@/components/ui/badge";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ItemAvailability = "available" | "sold-out" | "not-today";

/**
 * A dish on the menu as a card: the photo, the name, a line about it, its
 * marks, the price and a "+" that opens it. The whole card is clickable
 * through the heading's button (stretched with ::after), so the dish name
 * stays a real heading.
 */
export function MenuItemCard({
  item,
  priceCents,
  availability,
  onOpen,
}: {
  item: MenuItemView;
  priceCents: number;
  availability: ItemAvailability;
  onOpen: () => void;
}) {
  const t = useTranslations("Menu");
  const dietary = useTranslations("Dietary");
  const unavailable = availability !== "available";

  return (
    <article
      className={cn(
        "group relative flex h-full gap-4 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-border/70 transition-[translate,box-shadow,scale] duration-300 ease-out-soft focus-within:ring-2 focus-within:ring-ring active:scale-[0.99] sm:p-4",
        !unavailable && "hover:-translate-y-0.5 hover:shadow-lifted",
      )}
    >
      <div
        className={cn(
          "relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28",
          unavailable && "opacity-60 grayscale-[40%]",
        )}
      >
        <DishImage
          src={item.imageUrl}
          alt=""
          sizes="112px"
          className="transition-transform duration-700 ease-out-soft group-hover:scale-110"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-display text-lg leading-snug sm:text-xl">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "text-left outline-none after:absolute after:inset-0 after:rounded-2xl",
              "transition-colors group-hover:text-primary",
              unavailable && "text-foreground/60",
            )}
          >
            {item.name}
          </button>
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {availability === "sold-out" && <Badge variant="destructive">{t("soldOut")}</Badge>}
          {availability === "not-today" && <Badge variant="outline">{t("notToday")}</Badge>}
          {item.isSignature && availability === "available" && (
            <Badge variant="highlight">{t("signature")}</Badge>
          )}
          {item.spiceSelectable && (
            <span className="inline-flex items-center text-spice-hot" title={t("spiceChoice")}>
              <Flame aria-hidden className="size-3.5" fill="currentColor" />
              <span className="sr-only">{t("spiceChoice")}</span>
            </span>
          )}
          {item.dietaryTags.map((tag) => (
            <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span
            className={cn(
              "font-semibold tabular-nums",
              unavailable && "text-muted-foreground line-through decoration-1",
            )}
          >
            {formatLKR(priceCents, { whole: true })}
          </span>
          {!unavailable && (
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-[scale,background-color] duration-200 group-hover:scale-110 group-hover:bg-primary/90"
            >
              <Plus className="size-4" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
