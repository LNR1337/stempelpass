/* Stempeljagd Web-App: App offline verfügbar, Kartenkacheln zwischenspeichern */
const V = "sp-94-1793826586";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== "sp-tiles").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
let trimming = false;
async function trim(c){
  if (trimming) return; trimming = true;
  try { const ks = await c.keys(); if (ks.length > 1500) for (const k of ks.slice(0, ks.length - 1500)) await c.delete(k); } catch(e) {}
  trimming = false;
}
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  /* App selbst: erst Internet (immer die neueste Version), sonst aus dem Speicher */
  if (req.mode === "navigate" || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put("index.html", c)); } return r; })
      .catch(() => caches.match("index.html").then(h => h || caches.match("./"))));
    return;
  }
  /* Kartenkacheln: aus dem Speicher, im Hintergrund auffrischen */
  if (/(^|\.)tile\.openstreetmap\.org$|tile\.opentopomap\.org$|arcgisonline\.com$/.test(u.hostname)) {
    e.respondWith(caches.open("sp-tiles").then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === "opaque") { c.put(req, r.clone()); trim(c); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (u.origin === location.origin) e.respondWith(caches.match(req).then(h => h || fetch(req)));
});
