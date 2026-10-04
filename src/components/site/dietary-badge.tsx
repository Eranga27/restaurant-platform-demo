import { Leaf, Nut, Sprout, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const DIETARY_TAGS = ["vegetarian", "vegan", "halal", "contains-nuts"] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

const TAGS: Record<DietaryTag, { label: string; icon: LucideIcon | null; className: string }> = {
  vegetarian: { label: "Vegetarian", icon: Leaf, className: "text-diet-veg border-diet-veg/30" },
  vegan: { label: "Vegan", icon: Sprout, className: "text-diet-vegan border-diet-vegan/30" },
  halal: { label: "Halal", icon: null, className: "text-diet-halal border-diet-halal/30" },
  "contains-nuts": {
    label: "Contains nuts",
    icon: Nut,
    className: "text-diet-nuts border-diet-nuts/30",
  },
};

export function DietaryBadge({ tag, className }: { tag: DietaryTag; className?: string }) {
  const { label, icon: Icon, className: tone } = TAGS[tag];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-xs font-medium",
        tone,
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5" />}
      {label}
    </span>
  );
}
