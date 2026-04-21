const CACHE_NAME = 'slab-rush-1.8.0';
const ASSETS = [
    './?v=1.8.0',
    './index.html?v=1.8.0',
    './css/style.css?v=1.8.0',
    './css/carbon.css?v=1.8.0',
    './js/game.js?v=1.8.0',
    './js/matter.js?v=1.8.0',
    './assets/favicon/site.webmanifest?v=1.8.0',
    './assets/favicon/favicon.ico?v=1.8.0',
    './assets/favicon/favicon-32x32.png?v=1.8.0',
    './assets/favicon/favicon-16x16.png?v=1.8.0',
    './assets/favicon/apple-touch-icon.png?v=1.8.0',
    './assets/images/game_logo.png?v=1.8.0',
    './assets/audio/chime_sound.mp3?v=1.8.0',
    './assets/audio/game_over.mp3?v=1.8.0',
    './assets/audio/swoosh.mp3?v=1.8.0',
    './assets/audio/personal-best.mp3?v=1.8.0'
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
