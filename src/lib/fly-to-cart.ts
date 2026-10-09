/**
 * Added to the order: a small round copy of the dish's photo arcs from where
 * it was to the header's cart button, which then gives a little bounce (the
 * count badge pops on its own). It reuses the photo already showing in `from`,
 * so nothing is downloaded again. Decorative, and skipped for reduced motion,
 * when the cart button is off screen, or when there's no photo.
 */
export function flyToCart(from: Element | null) {
  const imageUrl = from?.querySelector("img")?.currentSrc;
  if (typeof window === "undefined" || !from || !imageUrl) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cart = document.querySelector<HTMLElement>("[data-cart-button]");
  if (!cart) return;

  const start = from.getBoundingClientRect();
  const end = cart.getBoundingClientRect();
  if (end.bottom < 0 || end.top > window.innerHeight || start.width === 0) return;

  const size = Math.min(96, start.width, start.height);
  const x0 = start.left + start.width / 2 - size / 2;
  const y0 = start.top + start.height / 2 - size / 2;
  const dx = end.left + end.width / 2 - (x0 + size / 2);
  const dy = end.top + end.height / 2 - (y0 + size / 2);

  const dot = document.createElement("div");
  dot.setAttribute("aria-hidden", "true");
  Object.assign(dot.style, {
    position: "fixed",
    left: `${x0}px`,
    top: `${y0}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "999px",
    backgroundImage: `url("${imageUrl.replace(/"/g, "%22")}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 10px 30px rgb(31 20 16 / 0.35), 0 0 0 3px var(--background)",
    zIndex: "120",
    pointerEvents: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.append(dot);

  // An arc: it rises a little first, then drops into the cart, shrinking as it goes.
  const lift = Math.min(140, Math.abs(dy) * 0.5 + 60);
  const flight = dot.animate(
    [
      { translate: "0 0", scale: "0.6", opacity: 0 },
      { translate: "0 0", scale: "1", opacity: 1, offset: 0.12 },
      { translate: `${dx * 0.45}px ${Math.min(0, dy) * 0.45 - lift}px`, scale: "0.7", offset: 0.5 },
      { translate: `${dx}px ${dy}px`, scale: "0.18", opacity: 0.9 },
    ],
    { duration: 850, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "forwards" },
  );
  flight.onfinish = () => {
    dot.remove();
    cart.animate([{ scale: "1" }, { scale: "1.18" }, { scale: "0.94" }, { scale: "1" }], {
      duration: 480,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  };
  flight.oncancel = () => dot.remove();
}
