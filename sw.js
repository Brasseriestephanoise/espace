/* Espace brasserie – service worker.
   Garde en cache les fichiers de l'appli (accueil, chargeurs, icônes) pour une ouverture instantanée ;
   réseau d'abord, cache en secours. Ne met JAMAIS en cache les réponses du moteur (script.google.com) ni les photos envoyées. */
const C = 'espace-v2';
const SHELL = ['./', 'index.html', 'tickets.html', 'pro.html', 'prospection.html', 'manifest.webmanifest', 'icon-espace-192.png', 'icon-espace.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== self.location.origin) return;
  const path = u.pathname.replace(/^\//, '') || './', ok = r.mode === 'navigate' || SHELL.indexOf(path) >= 0;
  if (!ok) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r.mode === 'navigate' ? u.pathname : r, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(r.mode === 'navigate' ? u.pathname : r).then(m => m || caches.match('index.html')).then(m => m || new Response('<meta charset=utf-8><p style="font-family:sans-serif;padding:24px">Pas de connexion internet.</p>', { headers: { 'Content-Type': 'text/html' } }))));
});
