"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The signature dishes in a row. On large screens, with motion allowed, the
 * section pins and the row slides sideways as you scroll down (GSAP
 * ScrollTrigger, loaded after the page). Otherwise it's a row you swipe or
 * scroll sideways.
 */
export function SignatureRail({ header, children }: { header: ReactNode; children: ReactNode }) {
  const section = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const query = window.matchMedia(
      "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    );
    if (!query.matches || !section.current || !track.current) return;
    let cancelled = false;
    let revert = () => {};
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled || !section.current || !track.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const el = section.current;
        const row = track.current;
        el.dataset.pinned = "";
        const distance = () => Math.max(0, row.scrollWidth - el.clientWidth);
        const ctx = gsap.context(() => {
          gsap.to(row, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.7,
              invalidateOnRefresh: true,
            },
          });
        }, el);
        revert = () => {
          ctx.revert();
          delete el.dataset.pinned;
        };
      },
    );
    return () => {
      cancelled = true;
      revert();
    };
  }, []);

  return (
    <div
      ref={section}
      className="group/rail overflow-hidden py-24 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:pt-24 lg:pb-12"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">{header}</div>
      <ul
        ref={track}
        className="mt-12 flex snap-x snap-mandatory [scrollbar-width:none] gap-6 overflow-x-auto px-4 pb-4 group-data-[pinned]/rail:overflow-visible sm:px-6 lg:snap-none lg:gap-10 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]"
      >
        {children}
      </ul>
    </div>
  );
}
