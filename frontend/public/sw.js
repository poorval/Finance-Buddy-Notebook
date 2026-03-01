// Basic PWA service worker — caches app shell for offline support
const CACHE_NAME = 'frugal-agent-v3';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => console.warn('PWA: Failed to cache initial assets')))
    );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
});

// Fetch: network-first for navigation and API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET, chrome extensions, and Next.js Hot Module Replacement (HMR)
    if (event.request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.pathname.includes('/_next/webpack-hmr')) return;

    // Network-first for HTML navigation, API, and auth routes
    if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cached = await caches.match(event.request);
                return cached || caches.match('/'); // Fallback to root if offline
            })
        );
        return;
    }

    // Cache-first for everything else (CSS, JS, images)
    event.respondWith(
        caches.match(event.request).then((cached) =>
            cached || fetch(event.request).then((response) => {
                if (response.ok && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Ignore fetch errors for static assets if offline
            })
        )
    );
});
