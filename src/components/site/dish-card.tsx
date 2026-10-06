import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";

import { DietaryBadge } from "./dietary-badge";
import { DishImage } from "./dish-image";

/** A signature dish on the home page: a tall photo, its number, name and price. Opens the dish on the menu. */
export async function DishCard({ item, index }: { item: MenuItemView; index: number }) {
  const dietary = await getTranslations("Dietary");
  return (
    <Link
      href={{ pathname: "/menu", query: { item: item.slug } }}
      data-cursor="View"
      className="group flex h-full flex-col gap-5"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
        <DishImage
          src={item.imageUrl}
          alt={item.name}
          sizes="(min-width: 1024px) 30vw, 78vw"
          className="transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.06]"
        />
        <span className="absolute top-4 left-4 font-mono text-xs tracking-[0.2em] text-white mix-blend-difference">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 border-t border-current/15 pt-4">
        <div className="space-y-2">
          <h3 className="font-display text-3xl leading-none transition-colors group-hover:text-primary">
            {item.name}
          </h3>
          <p className="line-clamp-2 max-w-xs text-sm text-muted-foreground">{item.description}</p>
          {item.dietaryTags.length > 0 && (
            <span className="flex flex-wrap gap-1.5 pt-1">
              {item.dietaryTags.map((tag) => (
                <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
              ))}
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">
          {formatLKR(item.basePriceCents)}
        </span>
      </div>
    </Link>
  );
}
