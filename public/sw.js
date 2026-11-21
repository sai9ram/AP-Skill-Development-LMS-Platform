const CACHE_NAME = "ap-skill-lms-v1";
const STATIC_ASSETS = [
  "/offline.html",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/ap-map-3d.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls or non-GET requests
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first for page navigations with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/ap-map-3d.jpg"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
