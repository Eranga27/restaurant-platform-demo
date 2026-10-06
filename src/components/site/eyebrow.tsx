import { cn } from "@/lib/utils";

/**
 * A chapter label in small monospaced capitals: "02 — Signatures". The number
 * and the rule are decorative; the label is read as plain text.
 */
export function Eyebrow({
  index,
  children,
  className,
}: {
  index?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 font-mono text-[0.7rem] font-medium tracking-[0.2em] uppercase",
        className,
      )}
    >
      {index !== undefined && (
        <span aria-hidden className="tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
      )}
      {index !== undefined && <span aria-hidden className="h-px w-8 bg-current opacity-40" />}
      <span>{children}</span>
    </p>
  );
}
