"use client";

import { useEffect } from "react";

/**
 * Smooth, weighted scrolling with a mouse or trackpad (Lenis). Phones and
 * tablets keep their native scrolling; nothing changes for reduced motion.
 * Pauses while a dialog or drawer locks the page, and lets anything marked
 * `data-lenis-prevent` scroll on its own. Loaded after the page appears.
 */
export function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let cancelled = false;
    let cleanup = () => {};
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({ anchors: { offset: -96 }, lerp: 0.11 });
      document.documentElement.classList.add("lenis");
      let frame = requestAnimationFrame(function raf(time) {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      });
      // Dialogs (Radix) lock the page by marking <body>: pause with them.
      const lock = new MutationObserver(() => {
        if (document.body.hasAttribute("data-scroll-locked")) lenis.stop();
        else lenis.start();
      });
      lock.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
      (window as unknown as { lenis?: unknown }).lenis = lenis;
      cleanup = () => {
        cancelAnimationFrame(frame);
        lock.disconnect();
        lenis.destroy();
        document.documentElement.classList.remove("lenis");
        delete (window as unknown as { lenis?: unknown }).lenis;
      };
    });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
  return null;
}
