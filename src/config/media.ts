/**
 * Page-level photography for the demo brand. Swap these when rebranding
 * (docs/REBRANDING.md). Credits: docs/CREDITS.md. Dish photos live with the
 * menu data (src/data/seed.ts, then the menu_items table).
 */

const unsplash = (id: string, width = 2000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

export const siteMedia = {
  /** Home hero: rice and curry on a banana leaf. */
  hero: unsplash("photo-1742281095650-dd3c50c08772", 2400),
  /** Home story section and About page: a Sri Lankan restaurant at dusk. */
  story: unsplash("photo-1783125386230-18640102261a"),
  /** Home events section: a spread of curries. */
  events: unsplash("photo-1743525700011-afac212694d7"),
  /** Branches page header: dining room. */
  branches: unsplash("photo-1658387574197-74efe5041d4c"),
} as const;
