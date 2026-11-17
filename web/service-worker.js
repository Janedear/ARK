/**
 * ARK Crisis Suite — service worker (website copy only)
 *
 * Goal: once someone has opened https://arks.solutions/ a single time, ARK opens again with no
 * internet at all — and people who are online still get fixes quickly.
 *
 *   App page (/app and /ARK-CRISIS-SUITE.html) → network first (3 s limit), saved copy as fallback
 *   Welcome page ("/")                          → network first, saved copy, else the app itself
 *   Icons, manifest, preview image              → saved copy first, refreshed in the background
 *   On-device AI library (esm.run / jsDelivr)   → saved copy first, so HALO+ can start offline
 *   /?patches, /?bugs, /?admin, hub APIs        → never touched (always live, never cached)
 *
 * Bump CACHE_VERSION whenever this file changes.
 */

const CACHE_VERSION = 'ark-v6';
const CACHE_NAME = `ark-cache-${CACHE_VERSION}`;
const APP_SHELL = '/ARK-CRISIS-SUITE.html';
const NETWORK_TIMEOUT_MS = 3000;

// Only files that are certain to exist — one missing file would cancel the whole install.
const LANDING = '/landing.html';
const PRECACHE_URLS = [
  APP_SHELL,
  LANDING,
  '/brand/halo-mascot.webp',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

const AI_LIBRARY_HOSTS = ['esm.run', 'cdn.jsdelivr.net'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Fetch each file on its own so one failure cannot block the rest.
      .then(cache => Promise.all(PRECACHE_URLS.map(url =>
        fetch(url, { cache: 'no-store' })
          .then(response => { if (response.ok) return cache.put(url, response); })
          .catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name.startsWith('ark-') && name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

function saveCopy(key, response) {
  if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(key, copy)).catch(() => {});
  }
  return response;
}

/** A page: try the network briefly so updates arrive, otherwise use the saved copy. */
function page(request, key) {
  const fromNetwork = fetch(request).then(response => {
    if (response.ok) saveCopy(key, response);
    return response;
  });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS));
  return Promise.race([fromNetwork, timeout])
    .then(response => (response.ok ? response : Promise.reject(new Error('bad status'))))
    .catch(() => caches.match(key, { ignoreSearch: true })
      // Offline with no saved welcome page: the app itself is the best thing to show.
      .then(saved => saved || (key === APP_SHELL ? null : caches.match(APP_SHELL, { ignoreSearch: true })))
      // Nothing saved at all yet: wait for the network however long it takes.
      .then(saved => saved || fromNetwork));
}

/** Static files: answer from the saved copy at once, refresh it quietly for next time. */
function savedFirst(request) {
  return caches.match(request).then(saved => {
    const refresh = fetch(request).then(response => saveCopy(request, response)).catch(() => saved);
    return saved || refresh;
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (AI_LIBRARY_HOSTS.includes(url.hostname)) event.respondWith(savedFirst(request));
    return; // everything else cross-origin (map tiles, fonts, model files) goes straight to the network
  }

  // Live endpoints and hub APIs are never cached or intercepted.
  if (url.search && /[?&](patches|bugs|admin)\b/.test(url.search)) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ark-data/')) return;

  if (url.pathname === '/app' || url.pathname === '/app/' || url.pathname === APP_SHELL) {
    event.respondWith(page(request, APP_SHELL));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.php' || url.pathname === LANDING) {
    event.respondWith(page(request, LANDING));
    return;
  }

  if (/\.(png|webp|svg|ico|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(savedFirst(request));
  }
  // Anything else: default browser behaviour.
});
