"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * A thin saffron line along the top of the screen while the next page loads:
 * it starts when a link to another page of the site is clicked and finishes
 * when the new page arrives. Clicks that open a new tab, stay on the page
 * (anchors, ?item= links) or leave the site don't start it. It also notes
 * where the click was, for the "lamp" page transition.
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
      // Where the "lamp" page transition opens from: the click (or the
      // link's middle, from the keyboard), relative to the new page, which
      // arrives scrolled to the top just under the header.
      const box = link.getBoundingClientRect();
      const keyboard = event.detail === 0;
      const x = keyboard ? box.left + box.width / 2 : event.clientX;
      const y = keyboard ? box.top + box.height / 2 : event.clientY;
      const top = document.getElementById("main")?.offsetTop ?? 0;
      const root = document.documentElement.style;
      root.setProperty("--vt-x", `${x}px`);
      root.setProperty("--vt-y", `${y - top}px`);
      setState("loading");
    };
    // Capture phase: links cancel the browser's navigation in their own
    // click handler, which would otherwise run first.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => setState("idle"), 450);
    return () => clearTimeout(timer);
  }, [state]);

  return <div aria-hidden className="nav-progress" data-state={state} />;
}
