import { formatLKR } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceProps = {
  cents: number;
  /** Original price, shown struck through when a promotion applies. */
  wasCents?: number;
  className?: string;
};

export function Price({ cents, wasCents, className }: PriceProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}>
      <span className="font-semibold">{formatLKR(cents)}</span>
      {wasCents !== undefined && wasCents > cents && (
        <s className="text-sm text-muted-foreground">
          <span className="sr-only">was </span>
          {formatLKR(wasCents)}
        </s>
      )}
    </span>
  );
}
