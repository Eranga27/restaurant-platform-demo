import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";
import { Kolam } from "./kolam";
import { SplitWords } from "./split-words";

/** "Get in touch" → "Get in <em>touch</em>": the last word as the italic accent. */
function accentLastWord(title: string): string {
  const escaped = title.replace(/[<>]/g, "");
  const at = escaped.lastIndexOf(" ");
  return at === -1
    ? `<em>${escaped}</em>`
    : `${escaped.slice(0, at + 1)}<em>${escaped.slice(at + 1)}</em>`;
}

/**
 * The top of a content page: a short label, a large title whose last word is
 * set in italic, rising word by word on arrival, and an intro. A faint kolam
 * sits behind it. With `image`, a photograph stands beside it on large screens
 * (below it on phones) and is wiped in on arrival (globals.css, .intro-image).
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  image,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  /** A photo for the page, shown with the title. Decorative unless `alt` says otherwise. */
  image?: { src: string; alt?: string };
  children?: ReactNode;
  className?: string;
}) {
  const text = (
    <div className="relative max-w-4xl space-y-6">
      {eyebrow && (
        <Eyebrow className="intro-fade text-muted-foreground [--d:0ms]">{eyebrow}</Eyebrow>
      )}
      <h1 className="intro-words text-display-2xl text-balance">
        <SplitWords markup={accentLastWord(title)} />
      </h1>
      {intro && (
        <div className="intro-fade max-w-2xl text-lg text-pretty text-muted-foreground [--d:450ms]">
          {intro}
        </div>
      )}
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        "relative pb-10 lg:pb-14",
        image &&
          "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-center lg:gap-16",
        className,
      )}
    >
      <Kolam
        size={7}
        className="pointer-events-none absolute -top-16 right-0 hidden w-[22rem] text-highlight opacity-[0.08] sm:block lg:-top-24"
      />
      {text}
      {image && (
        <div className="intro-image relative aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-muted shadow-lifted [--d:250ms] lg:aspect-[4/5]">
          <Image
            src={image.src}
            alt={image.alt ?? ""}
            fill
            preload
            sizes="(min-width: 1024px) 25rem, 100vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
