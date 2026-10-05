// Service worker for the customer site: when a page can't load because the
// visitor is offline, show the offline page in their language instead of the
// browser's error. Pages always come from the network first; nothing else is
// cached, so prices and menus are never stale. Registered with scope /.

const CACHE = "offline-v1";
const LOCALES = ["en", "si", "ta"];
const pageFor = (locale) => `/offline/${locale}.html`;
// Re-fetch the offline pages at most daily, so brand changes reach them.
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function cachePages() {
  const cache = await caches.open(CACHE);
  await cache.addAll(LOCALES.map((l) => new Request(pageFor(l), { cache: "reload" })));
  await cache.put("/offline/cached-at", new Response(String(Date.now())));
}

async function refreshIfStale() {
  const cache = await caches.open(CACHE);
  const stamp = await cache.match("/offline/cached-at");
  const cachedAt = stamp ? Number(await stamp.text()) : 0;
  if (Date.now() - cachedAt > MAX_AGE_MS) await cachePages().catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(cachePages().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith("offline-") && n !== CACHE).map((n) => caches.delete(n)),
      );
      // Start loading the page while the worker boots, so it adds no delay.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        const response = (await event.preloadResponse) ?? (await fetch(request));
        event.waitUntil(refreshIfStale());
        return response;
      } catch {
        const segment = new URL(request.url).pathname.split("/")[1];
        const locale = LOCALES.includes(segment) ? segment : "en";
        const cache = await caches.open(CACHE);
        return (await cache.match(pageFor(locale))) ?? Response.error();
      }
    })(),
  );
});
