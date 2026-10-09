import { cn } from "@/lib/utils";

/**
 * A band of words scrolling sideways without end, like a lacquer band turned
 * on a lathe (globals.css, .lacquer-band): poster type with a lacquer diamond
 * between words, on saffron or red, laid at a slight angle. The words are
 * repeated to fill any screen; the copy is decorative, so the band is hidden
 * from screen readers. Still for reduced motion.
 */
export function LacquerBand({
  words,
  tone = "saffron",
  reverse = false,
  className,
}: {
  words: string[];
  tone?: "saffron" | "lacquer";
  /** Scroll the other way (for a second, crossing band). */
  reverse?: boolean;
  className?: string;
}) {
  // Enough repeats that one copy is wider than a large screen; the second copy makes the loop seamless.
  const run = Array.from(
    { length: Math.max(2, Math.ceil(16 / Math.max(1, words.length))) },
    () => words,
  ).flat();
  const copy = (key: string) => (
    <ul key={key} className="lacquer-band-run">
      {run.map((word, i) => (
        <li key={i}>
          <span>{word}</span>
          <span className="lacquer-band-diamond" />
        </li>
      ))}
    </ul>
  );
  return (
    <div
      aria-hidden
      data-tone={tone}
      data-reverse={reverse || undefined}
      className={cn("lacquer-band font-poster", className)}
    >
      <div className="lacquer-band-track">
        {copy("a")}
        {copy("b")}
      </div>
    </div>
  );
}
