// public/sw.js — minimal offline shell.
// Strategy:
//   - Navigations: network-first, fall back to the cached shell when offline.
//   - Same-origin static assets (_next, icons): stale-while-revalidate.
//   - Never cache the Gemini scout API or cross-origin (Firebase) requests.

const CACHE = "apm-shell-v1";
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept the scout API or anything cross-origin (Firebase, Google).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first with cached-shell fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put("/", copy)));
          }
          return res;
        })
        .catch(async () => {
          const shell = await caches.match("/");
          const cachedReq = await caches.match(req);
          return (
            shell ||
            cachedReq ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
          }
          return res;
        })
        .catch(() => cached || new Response("", { status: 504, statusText: "Gateway Timeout" }));
      return cached || network;
    })
  );
});
