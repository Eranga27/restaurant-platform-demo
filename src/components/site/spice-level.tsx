import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export const SPICE_LEVELS = ["mild", "medium", "hot"] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

const LEVELS: Record<SpiceLevel, { label: string; flames: number; className: string }> = {
  mild: { label: "Mild", flames: 1, className: "text-spice-mild" },
  medium: { label: "Medium", flames: 2, className: "text-spice-medium" },
  hot: { label: "Sri Lankan Hot", flames: 3, className: "text-spice-hot" },
};

/** Read-only spice indicator. The selectable version lives in the item sheet (Phase 1). */
export function SpiceLevelIndicator({
  level,
  className,
}: {
  level: SpiceLevel;
  className?: string;
}) {
  const { label, flames, className: tone } = LEVELS[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", tone, className)}>
      <span aria-hidden className="inline-flex">
        {Array.from({ length: 3 }, (_, i) => (
          <Flame
            key={i}
            className={cn("size-3.5", i >= flames && "opacity-25")}
            fill={i < flames ? "currentColor" : "none"}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
