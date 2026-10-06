/**
 * Page transition types, passed to links as `transitionTypes` and turned into
 * animations by src/components/site/page-transition.tsx (styles in
 * globals.css). Links without a type, and the browser's back and forward,
 * get the default rise.
 */

/** Into ordering (Order now, a dish, an offer): the page opens in a circle from the click, like the splash's lamp. */
export const LAMP = ["lamp"];

/** Between the site's sections (header, menus, footer): the new page rises over the old like a lacquer curtain. */
export const CURTAIN = ["curtain"];

/** Back to the home page (the logo): a soft fade-through. */
export const HOME = ["home"];
