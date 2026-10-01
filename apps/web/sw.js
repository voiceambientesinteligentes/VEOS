// Service worker do VEOS (PWA): so arquivos do proprio site, rede primeiro (sempre a versao
// publicada mais nova) e cache como reserva para abrir sem internet. Dados da API (Supabase)
// nunca sao guardados aqui.
const CACHE = "veos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return r;
      })
      .catch(() => caches.match(req).then((r) => r ?? (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))),
  );
});
