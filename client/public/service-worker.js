const CACHE_NAME = 'controling-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Lista de patrones de URL a ignorar
const IGNORED_PATTERNS = [
  /notifications/i,
  /startup/i,
  /push/i,
  /subscribe/i,
  /\/api\//i
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Verificar si la URL debe ser ignorada
  const shouldIgnore = IGNORED_PATTERNS.some(pattern => 
    pattern.test(event.request.url)
  );

  if (shouldIgnore) {
    console.log('Ignorando solicitud:', event.request.url);
    return;
  }

  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
}); 