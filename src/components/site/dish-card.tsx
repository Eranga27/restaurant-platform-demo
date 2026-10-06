import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { MenuItemView } from "@/lib/data/catalogue";
import { formatLKR } from "@/lib/money";
import { LAMP } from "@/lib/transitions";

import { DietaryBadge } from "./dietary-badge";
import { DishImage } from "./dish-image";

/**
 * A bestseller on the home page: photo, name, a line about it, the price and
 * an "Add" that opens the dish on the menu, ready to go in the cart. On hover
 * the photo leans in and a little steam rises off the plate.
 */
export async function DishCard({ item }: { item: MenuItemView }) {
  const [dietary, t] = await Promise.all([getTranslations("Dietary"), getTranslations("Home")]);
  return (
    <Link
      href={{ pathname: "/menu", query: { item: item.slug } }}
      transitionTypes={LAMP}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/70 transition-[translate,box-shadow] duration-500 ease-out-soft hover:-translate-y-1 hover:shadow-lifted"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <DishImage
          src={item.imageUrl}
          alt={item.name}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw"
          className="transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.06]"
        />
        <span aria-hidden className="steam">
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </span>
        {item.dietaryTags.length > 0 && (
          <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {item.dietaryTags.map((tag) => (
              <DietaryBadge
                key={tag}
                tag={tag}
                label={dietary(tag)}
                className="bg-card/95 backdrop-blur-sm"
              />
            ))}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="font-display text-xl leading-tight sm:text-2xl">{item.name}</h3>
        <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">
          {item.description}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <span className="font-semibold tabular-nums">
            {formatLKR(item.basePriceCents, { whole: true })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90">
            <Plus aria-hidden className="size-3.5" />
            {t("addDish")}
          </span>
        </div>
      </div>
    </Link>
  );
}
