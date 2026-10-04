import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  title,
  subtitle,
  action,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl space-y-2">
        <h2 id={id} className="text-display-lg text-primary">
          {title}
        </h2>
        {subtitle && <p className="text-pretty text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
