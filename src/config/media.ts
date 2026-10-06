/**
 * Page-level photography and the home hero's video for the demo brand. Swap
 * these when rebranding (docs/REBRANDING.md). Credits: docs/CREDITS.md. Dish
 * photos live with the menu data (src/data/seed.ts, then the menu_items table).
 */
import { heroVideo } from "@/data/hero-video";

/** One cut of the hero video (scripts/build-hero-video.mjs writes these). */
export type HeroVideoCut = {
  width: number;
  height: number;
  /** The loop's first frame, shown until the video plays. */
  poster: string;
  /** In order of preference; the browser plays the first it supports. */
  sources: readonly { src: string; type: string }[];
};
export type HeroVideo = { landscape: HeroVideoCut; portrait: HeroVideoCut };

/** Screens that get the portrait cut and poster: phones and tablets held upright. */
export const HERO_PORTRAIT_MEDIA = "(orientation: portrait) and (max-width: 1023px)";

const unsplash = (id: string, width = 2000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

export const siteMedia: {
  hero: string;
  heroVideo: HeroVideo | null;
  story: string;
  events: string;
  branches: string;
} = {
  /** Home hero photo: rice and curry on a banana leaf. Shown when there's no video. */
  hero: unsplash("photo-1742281095650-dd3c50c08772", 2400),
  /** Home hero video: a chef tossing a flaming wok. `null` shows the photo instead. */
  heroVideo,
  /** Home story section and About page: a Sri Lankan restaurant at dusk. */
  story: unsplash("photo-1783125386230-18640102261a"),
  /** Home events section: a spread of curries. */
  events: unsplash("photo-1743525700011-afac212694d7"),
  /** Branches page header: dining room. */
  branches: unsplash("photo-1658387574197-74efe5041d4c"),
};
