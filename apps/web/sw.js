// Service worker do VEOS (PWA): so arquivos do proprio site, rede primeiro (sempre a versao
// publicada mais nova) e cache como reserva para abrir sem internet. Dados da API (Supabase)
// nunca sao guardados aqui.
const CACHE = "veos-v3";

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

// Aviso com o navegador fechado (Web Push): mostra o alerta e, ao tocar, abre/foca o VEOS na tela certa.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titulo: "VEOS", corpo: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(String(d.titulo || "VEOS").slice(0, 80), {
    body: String(d.corpo || "").slice(0, 200), tag: String(d.tag || "veos"), icon: "icons/icone-192.png", badge: "icons/icone-192.png", data: { href: String(d.href || "#/hoje") },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const href = e.notification.data?.href || "#/hoje";
  const base = new URL("./", self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const aberta = cs.find((c) => c.url.startsWith(base));
    if (aberta) { aberta.navigate(base + href); return aberta.focus(); }
    return self.clients.openWindow(base + href);
  }));
});
