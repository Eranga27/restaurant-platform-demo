import { cn } from "@/lib/utils";

/**
 * A short section label in small capitals, led by a saffron diamond (a nod to
 * the lacquer and kolam patterns). The diamond is decorative.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-xs font-semibold tracking-[0.16em] uppercase",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-highlight" />
      <span>{children}</span>
    </p>
  );
}
