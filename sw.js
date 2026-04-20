const CACHE_NAME = 'slab-rush-v1';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/carbon.css',
    './js/game.js',
    './assets/favicon/site.webmanifest',
    './assets/favicon/favicon.ico'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
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
