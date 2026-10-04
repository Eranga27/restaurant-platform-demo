import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  label,
  className,
}: {
  rating: number;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex gap-0.5 text-highlight", className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-4", i >= rating && "text-border")}
          fill="currentColor"
          strokeWidth={0}
        />
      ))}
    </span>
  );
}
