/* Fiche intervention Kivoitoo : garde l'appli dans le téléphone pour l'ouvrir même sans réseau.
   Avec du réseau : on prend toujours la dernière version publiée (la page). Sans réseau : la copie gardée en mémoire. */
const VERSION = 'fiche-v20';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'logo.png', 'icone-180.png', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' : on ignore le cache du navigateur (GitHub le garde 10 min), sinon on pourrait garder l'ancienne version
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
  const page = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if (page) {
    // La page : d'abord le réseau (version à jour), la copie en mémoire si pas de réseau ou réseau trop lent (4 s)
    e.respondWith(caches.open(VERSION).then(cache => {
      const reseau = fetch(req.url, { cache: 'no-cache' }).then(rep => {
        if (rep && rep.ok) cache.put('index.html', rep.clone());
        return rep;
      });
      const secours = new Promise(ok => setTimeout(ok, 4000)).then(() => cache.match('index.html'));
      return Promise.race([reseau.catch(() => cache.match('index.html')), secours.then(r => r || reseau)])
        .then(r => r || cache.match('index.html'));
    }));
    return;
  }
  // Images et autres fichiers : la mémoire d'abord, mise à jour discrète en arrière-plan
  e.respondWith(caches.open(VERSION).then(cache =>
    cache.match(req, { ignoreSearch: true }).then(enCache => {
      const reseau = fetch(req).then(rep => {
        if (rep && rep.ok) cache.put(req, rep.clone());
        return rep;
      }).catch(() => enCache);
      return enCache || reseau;
    })
  ));
});
