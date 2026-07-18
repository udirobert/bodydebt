// Orbura — ZK Artifact Cache Service Worker
// Pre-caches the 138MB pk.key, 4MB srs.key, and 10KB compiled.ezkl
// so proof generation is instant on return visits.

const CACHE_NAME = "orbura-zk-artifacts-v1";
const ZK_ARTIFACTS = [
  "/ezkl/pk.key",
  "/ezkl/srs.key",
  "/ezkl/compiled.ezkl",
  "/ezkl/settings.json",
];

// Install: pre-cache all ZK artifacts immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ZK_ARTIFACTS);
      console.log("[SW] ZK artifacts cached:", ZK_ARTIFACTS.length);
    })()
  );
  // Activate immediately — don't wait for page reload
  self.skipWaiting();
});

// Activate: clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      console.log("[SW] Ready — serving from cache");
    })()
  );
});

// Fetch: serve ZK artifacts from cache, fall back to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept our ZK artifact paths
  if (url.pathname.startsWith("/ezkl/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Not in cache — fetch and cache for next time
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        return response;
      })()
    );
  }
});
