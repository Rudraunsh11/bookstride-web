// Bump the shell cache when shipping changes to the interface or catalog, so
// the offline copy is refreshed. Online visitors always receive the latest page.
const shellCache = 'bookstride-shell-public-2026-11-19a';
const offlineBooksCache = 'bookstride-offline-books-v1';
const shellPaths = [
  'index.html', 'style.css?v=30', 'catalog.js?v=9', 'catalog-extra.js?v=13',
  'catalog-expanded.js?v=26', 'editions.js', 'install.js?v=27', 'app.js?v=28',
  'developer-card.js?v=13', 'manifest.json', 'assets/parchment.svg',
  'assets/bookstride.svg', 'assets/app-192.png', 'assets/app-512.png'
];
const scope = new URL(self.registration.scope);
const shellUrls = new Set(shellPaths.map(path => new URL(path, scope).href));
const indexUrl = new URL('index.html', scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(shellCache).then(cache => cache.addAll(
    shellPaths.map(path => new Request(new URL(path, scope), {cache: 'reload'}))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('bookstride-shell-') && key !== shellCache)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relativePath = url.pathname.slice(scope.pathname.length);
  if (request.mode === 'navigate' && ['', 'index.html'].includes(relativePath)) {
    // Network first, so a new release reaches online visitors even if the
    // shell cache name was not bumped. The cached page is the offline fallback;
    // it is not overwritten, because it must keep matching the cached assets.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) return response;
      return caches.match(indexUrl, {cacheName: shellCache}).then(cached => cached || response);
    }).catch(async () => await caches.match(indexUrl, {cacheName: shellCache}) || Response.error()));
  } else if (shellUrls.has(url.href)) {
    event.respondWith(caches.match(request, {cacheName: shellCache}).then(response => response || fetch(request)));
  } else if (/^books\/[a-z]+\.json$/.test(relativePath) && request.cache !== 'reload') {
    event.respondWith(fetch(request).catch(async () => {
      return await caches.match(request, {cacheName: offlineBooksCache}) || Response.error();
    }));
  }
});
