import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * A round sticker: words running round the rim, slowly turning, with the
 * brand's mark in the middle (globals.css, .spin-sticker). Decorative: the
 * words repeat what the page says elsewhere. Still for reduced motion.
 */
export function SpinSticker({
  text,
  mark,
  id,
  className,
}: {
  /** Words for the rim; spaced to fill it. */
  text: string;
  mark: string;
  /** Unique on the page, for the rim's path. */
  id: string;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("spin-sticker", className)}>
      <svg viewBox="0 0 200 200" className="spin-sticker-rim">
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} textLength={490} lengthAdjust="spacing">
            {text}
          </textPath>
        </text>
      </svg>
      <Image src={mark} alt="" width={96} height={96} className="spin-sticker-mark" />
    </div>
  );
}
