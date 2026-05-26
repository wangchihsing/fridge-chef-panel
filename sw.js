const CACHE = 'fridge-chef-v5';

self.addEventListener('install', e => {
    // Pre-cache a minimal shell; HTML is always network-first
    e.waitUntil(caches.open(CACHE).then(c => c.add('./')));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    // Delete all old caches
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    const isHTML = url.pathname.endsWith('/') ||
                   url.pathname.endsWith('.html') ||
                   url.pathname === '';

    if (isHTML) {
        // ── Network first for HTML ──────────────────────────────────────────
        // Always try to fetch the latest version from the server.
        // Fall back to cache only when offline.
        e.respondWith(
            fetch(e.request, { cache: 'no-cache' })
                .then(res => {
                    if (res.ok) {
                        // Update cache with fresh copy
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(e.request)
                    .then(cached => cached || caches.match('./'))
                )
        );
    } else {
        // ── Cache first for static assets (sw.js, manifest, icons) ─────────
        e.respondWith(
            caches.match(e.request).then(cached =>
                cached || fetch(e.request).then(res => {
                    if (res.ok && e.request.url.startsWith(self.location.origin)) {
                        const clone = res.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return res;
                }).catch(() => cached)
            )
        );
    }
});
