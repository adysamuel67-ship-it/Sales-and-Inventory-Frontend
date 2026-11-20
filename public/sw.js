/* Business Bot GH service worker.
 *
 * Static build assets are cache-first (immutable hashed filenames), public
 * images are stale-while-revalidate, and previously visited pages are kept so
 * they can be reopened offline. API calls are never cached here: cross-origin
 * requests pass straight through, and all offline business data lives in the
 * app's IndexedDB stores instead.
 */

const VERSION = 'bbgh-v2'
const STATIC_CACHE = `${VERSION}-static`
const PAGE_CACHE = `${VERSION}-pages`
const OFFLINE_URL = '/offline.html'
const APP_SHELL = [OFFLINE_URL, '/', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(PAGE_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined)),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(['/favicon.ico']).catch(() => undefined)),
    ]).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'BBGH_CLEAR_CACHES') return
  const cleared = caches
    .keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(VERSION)).map((k) => caches.delete(k))))
  if (event.waitUntil) event.waitUntil(cleared)
})

self.addEventListener('sync', (event) => {
  if (event.tag !== 'bbgh-outbox') return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: 'BBGH_FLUSH_SYNC' })
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL)))
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  if (/\.(png|jpg|jpeg|webp|svg|ico|gif|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => hit)
        return hit || network
      })
    )
  }
})
