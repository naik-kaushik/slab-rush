const CACHE_NAME = 'slab-rush-1.7.0';
const ASSETS = [
    './?v=1.7.0',
    './index.html?v=1.7.0',
    './css/style.css?v=1.7.0',
    './css/carbon.css?v=1.7.0',
    './js/game.js?v=1.7.0',
    './assets/favicon/site.webmanifest?v=1.7.0',
    './assets/favicon/favicon.ico?v=1.7.0'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
