const PRECACHE = "precache-v1";
const RUNTIME = "runtime";

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
  "index.html",
  "./", // Alias for index.html
  "assets/style.css",
  "assets/script.js",
  "assets/dialog-polyfill.css",
  "assets/dialog-polyfill.js",
  "assets/android-chrome-512x512.png",
  "assets/android-chrome-192x192.png",
  "assets/apple-touch-icon.png",
  "assets/browserconfig.xml",
  "assets/favicon-32x32.png",
  "assets/favicon-16x16.png",
  "assets/favicon.ico",
  "assets/mstile-150x150.png",
  "assets/safari-pinned-tab.svg",
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener("activate", (event) => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME).then((cache) => {
          return fetch(event.request).then((response) => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      })
    );
  }
});
