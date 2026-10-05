"use client";

import { useEffect } from "react";

/** Most elements that start revealing together; later ones don't wait any longer. */
const MAX_STAGGER = 6;
const STAGGER_MS = 90;

/**
 * Scroll reveals for elements marked `data-reveal` ("" rises in, "fade",
 * "zoom"). After hydration, marked elements below the fold are hidden
 * (`data-reveal-state="hidden"`) and shown as they scroll into view; ones
 * already on screen are left alone, so nothing flashes. Elements that enter
 * together are staggered. Watches for new elements (route changes, filtered
 * lists). Does nothing for visitors who prefer reduced motion, and without
 * JavaScript everything simply stays visible.
 */
export function MotionObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reveal = (el: HTMLElement, delay: number) => {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.revealState = "shown";
      // Drop the transition afterwards so it can't slow later hover effects.
      const settle = () => {
        el.dataset.revealState = "done";
      };
      el.addEventListener("transitionend", settle, { once: true });
      setTimeout(settle, 1600 + delay);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, i) => {
            observer.unobserve(entry.target);
            reveal(entry.target as HTMLElement, Math.min(i, MAX_STAGGER) * STAGGER_MS);
          });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );

    const scan = () => {
      const fold = window.innerHeight * 0.95;
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-state])")
        .forEach((el) => {
          const { top, bottom } = el.getBoundingClientRect();
          if (top < fold && bottom > 0) {
            el.dataset.revealState = "done";
          } else {
            el.dataset.revealState = "hidden";
            observer.observe(el);
          }
        });
    };

    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    scan();
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);
  return null;
}
