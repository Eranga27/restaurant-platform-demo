import { cn } from "@/lib/utils";

/**
 * A kolam: the threshold drawing of dots and looping lines made each morning
 * at Sri Lankan and South Indian doorways. Drawn here from a dot grid: a loop
 * around every dot and petals between neighbours. Decorative, in the current
 * text colour.
 */
export function Kolam({ size = 5, className }: { size?: number; className?: string }) {
  const step = 40;
  const span = (size - 1) * step;
  const pad = step;
  const dots: { x: number; y: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // A diamond of dots, as in a traditional kolam.
      if (Math.abs(r - (size - 1) / 2) + Math.abs(c - (size - 1) / 2) <= (size - 1) / 2) {
        dots.push({ x: pad + c * step, y: pad + r * step });
      }
    }
  }
  const petal = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = (y2 - y1) * 0.35;
    const dy = (x1 - x2) * 0.35;
    return `M${x1} ${y1}Q${mx + dx} ${my + dy} ${x2} ${y2}Q${mx - dx} ${my - dy} ${x1} ${y1}`;
  };
  const has = (x: number, y: number) => dots.some((d) => d.x === x && d.y === y);
  const petals: string[] = [];
  for (const d of dots) {
    if (has(d.x + step, d.y)) petals.push(petal(d.x + 8, d.y, d.x + step - 8, d.y));
    if (has(d.x, d.y + step)) petals.push(petal(d.x, d.y + 8, d.x, d.y + step - 8));
  }
  const view = span + pad * 2;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${view} ${view}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      className={cn("h-auto", className)}
    >
      {dots.map((d) => (
        <circle key={`${d.x}-${d.y}`} cx={d.x} cy={d.y} r="2.2" fill="currentColor" stroke="none" />
      ))}
      {dots.map((d) => (
        <circle key={`o${d.x}-${d.y}`} cx={d.x} cy={d.y} r="13" opacity="0.55" />
      ))}
      <path d={petals.join("")} opacity="0.85" />
    </svg>
  );
}
