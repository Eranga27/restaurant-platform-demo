"use client";

import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

import { DietaryBadge } from "@/components/site/dietary-badge";
import { DishImage } from "@/components/site/dish-image";
import { Badge } from "@/components/ui/badge";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ItemAvailability = "available" | "sold-out" | "not-today";

/**
 * A dish as a line on a printed menu: name, a dotted leader and the price,
 * then the description and its marks, with a small photo. The whole row is
 * clickable through the heading's button (stretched with ::after), so the
 * dish name stays a real heading.
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
    <article className="group relative grid grid-cols-[minmax(0,1fr)_auto] gap-5 border-t border-current/12 py-6 focus-within:bg-accent/40">
      <div className="min-w-0 space-y-2">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-2xl leading-tight sm:text-[1.75rem]">
            <button
              type="button"
              onClick={onOpen}
              className={cn(
                "text-left outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring",
                "transition-colors group-hover:text-primary",
                unavailable && "text-foreground/60",
              )}
            >
              {item.name}
            </button>
          </h3>
          <span
            aria-hidden
            className="mb-1.5 hidden min-w-6 flex-1 border-b border-dotted border-current/30 sm:block"
          />
          <span
            className={cn(
              "ml-auto shrink-0 font-mono text-sm tabular-nums sm:ml-0",
              unavailable && "text-muted-foreground line-through decoration-1",
            )}
          >
            {formatLKR(priceCents, { whole: true })}
          </span>
        </div>
        {item.description && (
          <p className="line-clamp-2 max-w-xl text-sm text-pretty text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
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
          {item.dietaryTags.map((tag) => (
            <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
          ))}
        </div>
      </div>
      <div
        className={cn(
          "relative size-20 shrink-0 overflow-hidden rounded-md bg-muted sm:size-24",
          unavailable && "opacity-60 grayscale-[40%]",
        )}
      >
        <DishImage
          src={item.imageUrl}
          alt=""
          sizes="96px"
          className="transition-transform duration-700 ease-out-soft group-hover:scale-110"
        />
      </div>
    </article>
  );
}
