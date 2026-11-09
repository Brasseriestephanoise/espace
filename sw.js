self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>new Response('<meta charset=utf-8><p style="font-family:sans-serif;padding:24px">Pas de connexion internet.</p>',{headers:{'Content-Type':'text/html'}})));});
