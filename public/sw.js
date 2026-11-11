// Only public assets belong in these caches. Never store HTML, RSC, API,
// authentication responses, uploaded documents, or account data.
const CACHE_PREFIX = "parsu-tracer-pwa-";
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`;
const OFFLINE_CACHE = `${CACHE_PREFIX}offline-v1`;
const OFFLINE_URL = "/offline.html";
const MAX_ASSETS = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== STATIC_CACHE &&
              key !== OFFLINE_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(OFFLINE_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }),
    );
    return;
  }

  // Next.js production assets have content-addressed URLs. Restrict both the
  // path and destination so server component responses cannot enter the cache.
  if (
    !url.pathname.startsWith("/_next/static/") ||
    !["script", "style", "font"].includes(request.destination)
  )
    return;

  const responsePromise = (async () => {
    const cache = await caches.open(STATIC_CACHE).catch(() => null);
    const cached = await cache?.match(request).catch(() => null);
    if (cached) return { response: cached };
    const response = await fetch(request);
    return {
      response,
      copy: response.ok && !response.redirected ? response.clone() : null,
    };
  })();

  event.respondWith(responsePromise.then(({ response }) => response));
  event.waitUntil(
    responsePromise
      .then(async ({ copy }) => {
        if (!copy) return;
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, copy);
        const keys = await cache.keys();
        await Promise.all(
          keys
            .slice(0, Math.max(0, keys.length - MAX_ASSETS))
            .map((key) => cache.delete(key)),
        );
      })
      .catch(() => {}), // Storage restrictions must not break online requests.
  );
});
