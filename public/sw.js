/* Zoralia — service worker.
 *
 * Il ne garde en cache que l'interface (pages, scripts, styles, polices, icônes) pour ouvrir l'appli
 * plus vite et la rendre installable. Les données (Supabase, Google…) ne passent JAMAIS par lui :
 * seules les requêtes GET de ce même site sont traitées.
 *
 * `__BUILD__` est remplacé à chaque build (voir vite.config.ts) : le fichier change donc à chaque
 * déploiement, le navigateur installe la nouvelle version, supprime l'ancien cache et l'appli se
 * recharge toute seule (src/lib/pwa.ts).
 */
const BUILD = '__BUILD__';
const CACHE = `zoralia-${BUILD}`;
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/logo.svg', '/icons/pas.svg', '/icons/pepite.svg', '/fonts/fredoka-latin.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('zoralia-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/sw.js') return;

  // Pages : le réseau d'abord (toujours la dernière version) ; hors ligne, on rend l'interface en cache.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }

  // Fichiers « hashés » de Vite : le nom change à chaque version, le cache est donc sûr.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  // Le reste (icônes, polices, manifeste) : on sert le cache tout de suite et on le rafraîchit en arrière-plan.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || fresh;
    }),
  );
});
