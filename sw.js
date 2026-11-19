/* Fiche intervention Kivoitoo : garde l'appli dans le téléphone pour l'ouvrir même sans réseau.
   Ouverture instantanée depuis la mémoire, puis mise à jour discrète en arrière-plan. */
const VERSION = 'fiche-v14';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'logo.png', 'icone-180.png', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Seules les pages de l'appli passent par ici ; l'envoi des fiches vers Google n'est jamais mis en cache
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(cache =>
    cache.match(req, { ignoreSearch: true }).then(enCache => {
      const reseau = fetch(req).then(rep => {
        if (rep && rep.ok) cache.put(req, rep.clone());
        return rep;
      }).catch(() => enCache || cache.match('index.html'));
      return enCache || reseau;
    })
  ));
});
