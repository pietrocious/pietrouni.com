// service worker for pietrouni.com pwa
// version-based cache busting
const CACHE_VERSION = "v1";
const CACHE_NAME = `pietrouni-${CACHE_VERSION}`;

// assets to cache on install (app shell)
const SHELL_ASSETS = ["/", "/index.html", "/styles.css", "/fonts/fixedsys.ttf"];

// assets to cache on first fetch
const RUNTIME_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\/assets\//,
];

// install event - cache shell assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching shell assets");
        return cache.addAll(SHELL_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith("pietrouni-") && name !== CACHE_NAME
            )
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// fetch event - cache-first for assets, network-first for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // skip non-GET requests
  if (request.method !== "GET") return;

  // skip chrome extensions and other non-http
  if (!url.protocol.startsWith("http")) return;

  // navigation requests - network first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // cache the latest version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // offline - serve from cache
          return caches
            .match(request)
            .then((cached) => cached || caches.match("/"));
        })
    );
    return;
  }

  // static assets - cache first
  const shouldCache = RUNTIME_CACHE_PATTERNS.some((pattern) =>
    pattern.test(request.url)
  );

  if (shouldCache || url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // only cache successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        });
      })
    );
    return;
  }

  // everything else - network only (like analytics)
  event.respondWith(fetch(request));
});
