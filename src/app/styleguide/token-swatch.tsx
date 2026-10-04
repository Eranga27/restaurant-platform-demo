"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Shows a colour token with the value currently in effect (so runtime rebrands show up). */
export function TokenSwatch({ name, textToken }: { name: string; textToken?: string }) {
  const value = useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim(),
    () => "",
  );

  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-soft">
      <div
        className="flex h-20 items-end p-3 text-sm font-medium"
        style={{
          backgroundColor: `var(--${name})`,
          color: textToken ? `var(--${textToken})` : undefined,
        }}
      >
        {textToken ? "Aa" : null}
      </div>
      <figcaption className="space-y-0.5 p-3 text-xs">
        <div className="font-medium">--{name}</div>
        <div className="font-mono text-muted-foreground uppercase">{value || " "}</div>
      </figcaption>
    </figure>
  );
}
