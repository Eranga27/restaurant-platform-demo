"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A soft follower for mouse users: a dot that trails the pointer and opens into
 * a labelled circle over anything marked `data-cursor="View"`. The normal
 * pointer stays, so nothing about using the page changes. Not on touch
 * screens, and still for reduced motion (it simply isn't shown).
 */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;
    let started = false;
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.22;
      pos.y += (target.y - pos.y) * 0.22;
      if (ref.current) ref.current.style.translate = `${pos.x}px ${pos.y}px`;
      frame = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!started) {
        started = true;
        pos.x = target.x;
        pos.y = target.y;
        setEnabled(true);
        frame = requestAnimationFrame(tick);
      }
      const hit = (e.target as Element | null)?.closest?.("[data-cursor]");
      setLabel(hit ? hit.getAttribute("data-cursor") || "" : null);
    };
    const leave = () => setLabel(null);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  if (!enabled) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[70] hidden md:block"
    >
      <div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-highlight font-mono text-[0.65rem] font-medium tracking-[0.15em] text-highlight-foreground uppercase transition-[width,height,opacity] duration-300 ease-out-soft"
        style={{
          width: label !== null ? 84 : 10,
          height: label !== null ? 84 : 10,
          opacity: label === "" ? 0.85 : 1,
        }}
      >
        {label ? label : null}
      </div>
    </div>
  );
}
