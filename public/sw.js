const CACHE_NAME = 'leasevora-v3';

const STATIC_ASSETS = [
  '/',
  '/style.css',
  '/app.js',
  '/pages/dashboard.js',
  '/pages/properties.js',
  '/pages/units.js',
  '/pages/locataires.js',
  '/pages/sejours.js',
  '/pages/calendrier.js',
  '/pages/transactions.js',
  '/pages/caisse.js',
  '/pages/finance.js',
  '/pages/travaux.js',
  '/pages/compteurs.js',
  '/pages/categories.js',
  '/pages/users.js',
];

// Install : pré-cache tous les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate : supprime les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch : stratégie différenciée API vs assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Requêtes API : network only, pas de cache
  if (url.pathname.startsWith('/api')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Requêtes externes (CDN, polices) : network first, pas de cache SW
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets statiques : cache first, fallback network, fallback page /
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Mettre en cache la réponse réseau pour la prochaine fois
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'opaque'
          ) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline et ressource non en cache : retourner la page d'accueil
          return caches.match('/');
        });
    })
  );
});
