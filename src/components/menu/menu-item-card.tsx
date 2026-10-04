"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import { DietaryBadge } from "@/components/site/dietary-badge";
import { DishImage } from "@/components/site/dish-image";
import { Price } from "@/components/site/price";
import { Badge } from "@/components/ui/badge";
import type { MenuItemView } from "@/lib/data/catalogue";
import { cn } from "@/lib/utils";

export type ItemAvailability = "available" | "sold-out" | "not-today";

/**
 * A menu item. The whole card is clickable through the heading's button
 * (stretched with ::after), so the dish name stays a real heading.
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
        "group relative flex gap-4 rounded-2xl border bg-card p-4 shadow-soft transition-[box-shadow,border-color] focus-within:border-ring hover:border-primary/30 hover:shadow-lifted",
        unavailable && "bg-muted/40",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-display text-lg leading-snug">
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "text-left text-foreground outline-none group-hover:text-primary after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring",
              unavailable && "text-foreground/70",
            )}
          >
            {item.name}
          </button>
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
          <Price
            cents={priceCents}
            className={cn("text-primary", unavailable && "text-muted-foreground")}
          />
          {availability === "sold-out" && <Badge variant="destructive">{t("soldOut")}</Badge>}
          {availability === "not-today" && <Badge variant="outline">{t("notToday")}</Badge>}
          {item.isSignature && availability === "available" && (
            <Badge variant="highlight">{t("signature")}</Badge>
          )}
          {item.spiceSelectable && (
            <span
              className="inline-flex items-center gap-1 text-xs text-spice-hot"
              title={t("spiceChoice")}
            >
              <Flame aria-hidden className="size-3.5" fill="currentColor" />
              <span className="sr-only">{t("spiceChoice")}</span>
            </span>
          )}
        </div>
        {item.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.dietaryTags.map((tag) => (
              <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
            ))}
          </div>
        )}
      </div>
      <div
        className={cn(
          "relative size-24 shrink-0 overflow-hidden rounded-xl sm:size-28",
          unavailable && "opacity-60 grayscale-[40%]",
        )}
      >
        <DishImage src={item.imageUrl} alt="" sizes="112px" />
      </div>
    </article>
  );
}
