import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { MenuItemView } from "@/lib/data/catalogue";

import { DietaryBadge } from "./dietary-badge";
import { DishImage } from "./dish-image";
import { Price } from "./price";

/** Signature dish card for the home page. Links to the dish on the menu. */
export async function DishCard({ item, priority }: { item: MenuItemView; priority?: boolean }) {
  const [t, dietary] = await Promise.all([getTranslations("Menu"), getTranslations("Dietary")]);
  return (
    <Link
      href={{ pathname: "/menu", query: { item: item.slug } }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lifted"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <DishImage
          src={item.imageUrl}
          alt={item.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 78vw"
          priority={priority}
          className="transition-transform duration-500 ease-out-soft group-hover:scale-105"
        />
        <Badge variant="highlight" className="absolute top-3 left-3">
          {t("signature")}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl text-foreground group-hover:text-primary">
          {item.name}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          <Price cents={item.basePriceCents} className="text-primary" />
          <span className="flex flex-wrap gap-1.5">
            {item.dietaryTags.map((tag) => (
              <DietaryBadge key={tag} tag={tag} label={dietary(tag)} />
            ))}
          </span>
        </div>
      </div>
    </Link>
  );
}
