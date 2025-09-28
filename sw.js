const CACHE_NAME = 'emprendedoras-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/login.html',
  '/nosotros.html',
  '/producto.html',
  '/src/css/styles.css',
  '/src/css/admin.css',
  '/src/css/admin-new.css',
  '/src/css/login.css',
  '/src/js/app.js',
  '/src/js/admin.js',
  '/src/js/login.js',
  '/src/js/producto.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // No interceptar peticiones a Supabase
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Intentar obtener la respuesta del caché
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en caché, hacer la petición a la red
        const networkResponse = await fetch(event.request);

        // Solo cachear respuestas exitosas de tipo 'basic' (misma origen)
        if (networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          await cache.put(event.request, responseToCache);
        }

        return networkResponse;
      } catch (error) {
        console.error('Service Worker fetch error:', error);
        
        // Si hay un error y la petición es de un archivo HTML, devolver la página de offline
        if (event.request.headers.get('Accept').includes('text/html')) {
          return new Response('Estás offline. Por favor, revisa tu conexión a internet.', {
            headers: { 'Content-Type': 'text/html' }
          });
        }

        return new Response('Network error', { status: 500 });
      }
    })()
  );
});