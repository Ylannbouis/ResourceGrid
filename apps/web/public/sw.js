// Service worker for installability + an app-shell cache (network-first GET, with a
// cache fallback so the shell opens offline). Offline pin drafting is handled in the app
// layer: a localStorage snapshot + a pending-mutation queue that flushes on reconnect
// (see apps/web/src/lib/offline.ts and api.ts).
const CACHE = "resourcegrid-shell-v1";
const SHELL = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Never cache API or socket traffic — always go to network.
  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api")) {
    return;
  }
  // Network-first, falling back to cache so the shell still opens offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((r) => r ?? caches.match("/"))),
  );
});
