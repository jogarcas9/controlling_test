/* eslint-disable no-restricted-globals */

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available Workbox modules, or add any other
// code you'd like.
// You can also remove this file if you'd prefer not to use a
// service worker, and the Workbox build step will be skipped.

const CACHE_NAME = 'controling-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/images/logo192.png',
  '/images/logo512.png',
  '/offline.html'
];

// Instalación - precachear recursos estáticos
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Service Worker: Cacheando archivos estáticos');
          return cache.addAll(STATIC_ASSETS);
        }),
      caches.open(DYNAMIC_CACHE)
    ])
    .then(() => {
      console.log('Service Worker: Instalación completada');
      return self.skipWaiting();
    })
  );
});

// Activación - limpiar cachés antiguos
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Eliminando caché antigua', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Ahora está activo y controlando la página');
      return self.clients.claim();
    })
  );
});

// Estrategia de caché: Cache First para estáticos, Network First para dinámicos
self.addEventListener('fetch', event => {
  // No interceptar peticiones a la API o socket.io
  if (event.request.url.includes('/api/') || event.request.url.includes('/socket.io/')) {
    console.log('Service Worker: Petición a API o Socket.IO, no interceptada', event.request.url);
    return;
  }

  // Para recursos estáticos, usar Cache First
  if (isStaticAsset(event.request.url)) {
    console.log('Service Worker: Fetch estático', event.request.url);
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log('Service Worker: Sirviendo desde caché', event.request.url);
            return response;
          }
          
          console.log('Service Worker: No encontrado en caché, buscando en red', event.request.url);
          return fetchAndCache(event.request, STATIC_CACHE);
        })
        .catch(error => {
          console.error('Service Worker: Error al recuperar recurso estático', error);
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // Para recursos dinámicos, usar Network First
  console.log('Service Worker: Fetch dinámico', event.request.url);
  event.respondWith(
    fetch(event.request)
      .then(response => {
        console.log('Service Worker: Respuesta de red exitosa', event.request.url);
        // Clonar la respuesta porque solo se puede usar una vez
        const responseToCache = response.clone();
        
        // Guardar en caché dinámica
        caches.open(DYNAMIC_CACHE)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        console.log('Service Worker: Fallo de red, intentando caché', event.request.url);
        // Si falla la red, intentar servir desde caché
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('Service Worker: Sirviendo desde caché dinámica', event.request.url);
              return cachedResponse;
            }
            
            // Si es una navegación, servir offline.html
            if (event.request.mode === 'navigate') {
              console.log('Service Worker: Sirviendo página offline');
              return caches.match('/offline.html');
            }
            
            console.log('Service Worker: Recurso no disponible sin conexión', event.request.url);
            return new Response('Error de red: Recurso no disponible sin conexión', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Funciones auxiliares
function isStaticAsset(url) {
  const staticPatterns = STATIC_ASSETS.map(asset => new URL(asset, self.location.origin).href);
  return staticPatterns.some(pattern => url === pattern);
}

function fetchAndCache(request, cacheName) {
  return fetch(request)
    .then(response => {
      // Solo cachear respuestas válidas
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      const responseToCache = response.clone();
      caches.open(cacheName)
        .then(cache => {
          cache.put(request, responseToCache);
        });

      return response;
    });
}

// Manejo de actualizaciones
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Recibida instrucción para activarse inmediatamente');
    self.skipWaiting();
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    console.log('Service Worker: Intentando sincronización de gastos');
    event.waitUntil(syncExpensesData());
  }
});

// Función para sincronizar datos pendientes
async function syncExpensesData() {
  try {
    // Aquí implementaríamos la lógica para sincronizar datos pendientes
    // cuando se recupera la conexión
    console.log('Sincronizando datos pendientes...');
  } catch (error) {
    console.error('Error al sincronizar datos:', error);
  }
}

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Notificación push recibida');
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación',
      icon: '/images/logo192.png',
      badge: '/images/logo192.png',
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Controling', options)
    );
  } catch (error) {
    console.error('Error al procesar notificación push:', error);
    
    // Mostrar una notificación genérica si hay error al parsear
    event.waitUntil(
      self.registration.showNotification('Controling', {
        body: 'Tienes una nueva notificación',
        icon: '/images/logo192.png'
      })
    );
  }
});

// Acción al hacer clic en una notificación
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Clic en notificación');
  
  event.notification.close();
  
  const url = event.notification.data && event.notification.data.url ? 
              event.notification.data.url : '/';
              
  event.waitUntil(
    clients.openWindow(url)
  );
}); 