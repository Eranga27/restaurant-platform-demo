"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HERO_PORTRAIT_MEDIA, type HeroVideo } from "@/config/media";
import { cn } from "@/lib/utils";

import { HeaderTone } from "./header-tone";

const PAUSED_KEY = "hero-video-paused";

type Connection = { saveData?: boolean; effectiveType?: string };

/** Off for reduced motion, data saver and 2G: those visitors keep the poster. */
function videoAllowed() {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !connection?.saveData &&
    !/2g/.test(connection?.effectiveType ?? "")
  );
}

function readPaused() {
  try {
    return sessionStorage.getItem(PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writePaused(paused: boolean) {
  try {
    if (paused) sessionStorage.setItem(PAUSED_KEY, "1");
    else sessionStorage.removeItem(PAUSED_KEY);
  } catch {
    // Storage blocked: the choice lasts until the page is left.
  }
}

/** Runs once the page has loaded and the browser is idle, so the video never delays it. */
function afterLoad(run: () => void) {
  let cancelIdle = () => {};
  const idle = () => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      cancelIdle = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, 200);
      cancelIdle = () => window.clearTimeout(id);
    }
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  return () => {
    window.removeEventListener("load", idle);
    cancelIdle();
  };
}

/**
 * Picks the cut for the screen and the first format the browser plays, then
 * plays it, muted. `refused` runs if the browser won't autoplay (e.g. iPhone
 * Low Power Mode), so the visitor gets a play button instead.
 */
function playVideo(el: HTMLVideoElement, video: HeroVideo, refused: () => void) {
  if (!el.getAttribute("src")) {
    const cut = window.matchMedia(HERO_PORTRAIT_MEDIA).matches ? video.portrait : video.landscape;
    const source = cut.sources.find((s) => el.canPlayType(s.type) !== "");
    if (!source) return;
    el.src = source.src;
  }
  el.muted = true;
  el.play().catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "NotAllowedError") refused();
  });
}

/**
 * The home page's first screen: the kitchen video filling the screen under the
 * transparent header, with the headline and the ways in (`children`) set over
 * a shade at the bottom. The video drifts and dims a little as the page
 * scrolls on (globals.css, .hero-recede).
 *
 * The poster is server-rendered and is what loads first. The video starts
 * after the page has loaded, fades in over its own first frame, pauses while
 * it's scrolled away, and has a pause button (WCAG 2.2.2) whose choice lasts
 * for the visit. Without a video (`video` null) the poster is a photo.
 */
export function HeroScene({
  video,
  poster,
  labels,
  children,
}: {
  video: HeroVideo | null;
  poster: React.ReactNode;
  labels: { play: string; pause: string };
  children: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  // "off" until the video may play; then the button shows.
  const [state, setState] = useState<"off" | "playing" | "paused">("off");
  const [shown, setShown] = useState(false);
  const userPaused = useRef(false);
  const inView = useRef(true);

  useEffect(() => {
    if (!video || !videoAllowed()) return;
    const el = player.current;
    const marker = sentinel.current;
    if (!el || !marker) return;
    const play = () => playVideo(el, video, () => setState("paused"));

    const cancel = afterLoad(() => {
      userPaused.current = readPaused();
      setState(userPaused.current ? "paused" : "playing");
      if (!userPaused.current) play();
    });

    // Scrolled away: no need to keep decoding.
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry?.isIntersecting ?? true;
      if (!el.getAttribute("src") || userPaused.current) return;
      if (inView.current) play();
      else el.pause();
    });
    observer.observe(marker);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduce = () => {
      if (!reduce.matches) return;
      el.pause();
      setState("off");
    };
    reduce.addEventListener("change", onReduce);
    return () => {
      cancel();
      observer.disconnect();
      reduce.removeEventListener("change", onReduce);
    };
  }, [video]);

  const toggle = () => {
    const el = player.current;
    if (!el || !video) return;
    const pause = state === "playing";
    userPaused.current = pause;
    writePaused(pause);
    setState(pause ? "paused" : "playing");
    if (pause) el.pause();
    else if (inView.current) playVideo(el, video, () => setState("paused"));
  };

  return (
    <div
      ref={sentinel}
      className="relative isolate -mt-18 flex min-h-[100svh] flex-col justify-end overflow-hidden surface-ink"
    >
      <HeaderTone />
      <div className="hero-recede absolute inset-0 -z-10">
        <div className="absolute inset-0 animate-hero-settle">
          {poster}
          {video && (
            <video
              ref={player}
              aria-hidden
              tabIndex={-1}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              disableRemotePlayback
              onPlay={() => setState("playing")}
              onPlaying={() => setShown(true)}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-1000",
                shown ? "opacity-100" : "opacity-0",
              )}
            />
          )}
        </div>
        {/* Shade under the header, and a deep one under the headline; the flame stays clear. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--foreground)_70%,transparent)_0%,color-mix(in_srgb,var(--foreground)_25%,transparent)_16%,transparent_32%,color-mix(in_srgb,var(--foreground)_45%,transparent)_55%,color-mix(in_srgb,var(--foreground)_92%,transparent)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_55%,transparent)_0%,transparent_60%)] md:block"
        />
      </div>

      {children}

      {state !== "off" && (
        <button
          type="button"
          onClick={toggle}
          aria-label={state === "playing" ? labels.pause : labels.play}
          className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full border border-current/35 bg-black/20 backdrop-blur-sm transition-colors hover:bg-white/15 sm:right-6 lg:right-8 lg:bottom-8"
        >
          {state === "playing" ? (
            <Pause aria-hidden className="size-4" fill="currentColor" />
          ) : (
            <Play aria-hidden className="size-4 translate-x-px" fill="currentColor" />
          )}
        </button>
      )}
    </div>
  );
}
