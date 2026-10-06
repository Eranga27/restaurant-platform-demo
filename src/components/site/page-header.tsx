import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";
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
 * The top of a content page: a chapter label, a very large title whose last
 * word is set in italic, rising word by word on arrival, and an intro.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-4xl space-y-6 pb-10 lg:pb-14", className)}>
      {eyebrow && <Eyebrow className="text-muted-foreground">{eyebrow}</Eyebrow>}
      <h1 className="intro-words text-display-2xl text-balance">
        <SplitWords markup={accentLastWord(title)} />
      </h1>
      {intro && <div className="max-w-2xl text-lg text-pretty text-muted-foreground">{intro}</div>}
      {children}
    </div>
  );
}
