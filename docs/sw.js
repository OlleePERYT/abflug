// Offline-Speicher für Abflug!. Die Seite kommt zuerst aus dem Netz, damit Updates sofort
// ankommen, und ohne Netz aus dem Cache. Icons und Schriften kommen zuerst aus dem Cache.
// scripts/pages.sh setzt bei jedem Bau eine neue Versionsmarke ein, alte Caches werden dann gelöscht.
const CACHE = "abflug-209ada933f27";
const CORE = ["./", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("./", copy));
      return res;
    }).catch(() => caches.match("./")));
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== location.origin && !/(^|\.)(gstatic|googleapis)\.com$/.test(url.hostname)) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
