const CACHE_NAME = 'leasevora-v23';

const STATIC_ASSETS = [
  '/',
  '/style.css?v=22',
  '/app.js?v=22',
  '/pages/dashboard.js?v=22',
  '/pages/properties.js?v=22',
  '/pages/units.js?v=22',
  '/pages/locataires.js?v=22',
  '/pages/sejours.js?v=22',
  '/pages/calendrier.js?v=22',
  '/pages/transactions.js?v=22',
  '/pages/caisse.js?v=22',
  '/pages/comptes.js?v=22',
  '/pages/finance.js?v=22',
  '/pages/paiements.js?v=22',
  '/pages/travaux.js?v=22',
  '/pages/compteurs.js?v=22',
  '/pages/categories.js?v=22',
  '/pages/notes.js?v=22',
  '/pages/users.js?v=22',
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

  // Assets statiques : network first, fallback cache, fallback page /
  // Network first garantit que les mises à jour sont toujours visibles
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Mettre en cache la réponse réseau pour le mode offline
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline : servir depuis le cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});
