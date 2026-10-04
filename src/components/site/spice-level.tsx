import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export const SPICE_LEVELS = ["mild", "medium", "hot"] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

const LEVELS: Record<SpiceLevel, { flames: number; className: string }> = {
  mild: { flames: 1, className: "text-spice-mild" },
  medium: { flames: 2, className: "text-spice-medium" },
  hot: { flames: 3, className: "text-spice-hot" },
};

/** Spice indicator. Presentational: callers pass the translated label (messages: Spice.*). */
export function SpiceLevelIndicator({
  level,
  label,
  className,
}: {
  level: SpiceLevel;
  label: string;
  className?: string;
}) {
  const { flames, className: tone } = LEVELS[level];
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
