import { cn } from "@/lib/utils";

/**
 * A band of words that drifts sideways, e.g. dish names. Two copies scroll as
 * one loop; the second is hidden from screen readers. Still for reduced motion.
 */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="marquee-track flex shrink-0 items-center gap-10 pr-10"
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-10 whitespace-nowrap">
          <span className="font-display text-[clamp(1.75rem,1.2rem+2vw,3rem)] italic">{item}</span>
          <span aria-hidden className="text-xl opacity-70">
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("marquee flex overflow-hidden py-5 select-none", className)}>
      {row(false)}
      {row(true)}
    </div>
  );
}
