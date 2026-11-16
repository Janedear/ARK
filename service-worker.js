/**
 * ARK Crisis Suite — Service Worker
 *
 * Offline-first cache strategy:
 *   - App shell (HTML files, manifest, SW itself) → cache-first with network fallback
 *   - Everything else → network-first with cache fallback
 *
 * Cache versioning: bump CACHE_VERSION on every deploy to bust stale assets.
 * On activate, old caches are deleted automatically.
 */

const CACHE_VERSION = 'ark-v2';
const CACHE_NAME = `ark-cache-${CACHE_VERSION}`;

/** Files to pre-cache on install — the full offline experience lives here */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/landing.html',
  '/ARK-CRISIS-SUITE.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512.svg',
  '/icons/apple-touch-icon.png',
  '/og-image.png'
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name.startsWith('ark-cache-') && name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  // Only handle GET requests; let others pass through
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, analytics, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // App shell: cache-first (the whole point is offline-first)
  const isAppShell = PRECACHE_URLS.some(path =>
    url.pathname === path || url.pathname === path.replace('/index.html', '/')
  );

  if (isAppShell) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetchAndCache(event.request))
    );
    return;
  }

  // Everything else: network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchAndCache(request) {
  return fetch(request).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  });
}
