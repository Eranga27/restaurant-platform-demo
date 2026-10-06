"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A thin saffron line along the top of the screen while the next page loads:
 * it starts when a link to another page of the site is clicked and finishes
 * when the new page arrives. Clicks that open a new tab, stay on the page
 * (anchors, ?item= links) or leave the site don't start it.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [prevPath, setPrevPath] = useState(pathname);

  // The new page is here: finish the line (adjusting state during render).
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (state === "loading") setState("done");
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      setState("loading");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => setState("idle"), 450);
    return () => clearTimeout(timer);
  }, [state]);

  return <div aria-hidden className="nav-progress" data-state={state} />;
}
