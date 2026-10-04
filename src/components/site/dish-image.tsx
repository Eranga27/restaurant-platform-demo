import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A dish photo, or a branded placeholder when there isn't one. Fills its
 * parent, which sets the aspect ratio.
 */
export function DishImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        {...(alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true })}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted",
          "bg-[radial-gradient(circle_at_25%_25%,color-mix(in_srgb,var(--highlight)_22%,transparent)_0,transparent_45%),radial-gradient(circle_at_80%_80%,color-mix(in_srgb,var(--secondary)_14%,transparent)_0,transparent_40%)]",
          className,
        )}
      >
        <UtensilsCrossed aria-hidden className="size-8 text-primary/35" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
