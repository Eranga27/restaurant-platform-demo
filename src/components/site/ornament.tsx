import { cn } from "@/lib/utils";

/**
 * A small lotus divider in the spirit of Sri Lankan palapethi borders, used
 * above section headings. Decorative; takes the text colour (turmeric by default).
 */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 16"
      fill="none"
      aria-hidden
      className={cn("h-4 w-24 text-highlight", className)}
    >
      <path d="M2 8h28M66 8h28" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="35" cy="8" r="1.6" fill="currentColor" />
      <circle cx="61" cy="8" r="1.6" fill="currentColor" />
      <path d="M48 1.5c3.2 2.8 3.8 8 0 13-3.8-5-3.2-10.2 0-13Z" fill="currentColor" />
      <path
        d="M48 14.5c-2.4-3.2-5.8-4.8-9.4-4.4 1.8 3 5.2 4.6 9.4 4.4Z"
        fill="currentColor"
        opacity=".7"
      />
      <path
        d="M48 14.5c2.4-3.2 5.8-4.8 9.4-4.4-1.8 3-5.2 4.6-9.4 4.4Z"
        fill="currentColor"
        opacity=".7"
      />
    </svg>
  );
}
