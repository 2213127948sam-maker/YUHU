const CACHE = '__CACHE_NAME__';
const PRECACHE = __PRECACHE__;
const scope = self.registration.scope;
const assetUrl = name => new URL(name, scope).href;
self.addEventListener('install', event => {
  // If any build asset fails, do not activate this version. Previous cache survives.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(assetUrl))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tft-data-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if(event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
async function serve(request) {
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== new URL(scope).origin || !url.href.startsWith(scope)) return fetch(request);
  const cache = await caches.open(CACHE);
  if(request.mode === 'navigate') {
    // Serve one coherent installed build. New HTML must not outrun its cached JS.
    const installed = await cache.match(assetUrl('index.html'));
    if(installed) return installed;
    try {
      const response = await fetch(request, {signal: AbortSignal.timeout(5000)});
      if(response.ok) return response;
    } catch { /* Use the coherent installed build, never overwrite it with an error page. */ }
    return Response.error();
  }
  const hit = await cache.match(request);
  if(hit) return hit;
  return fetch(request);
}
self.addEventListener('fetch', event => event.respondWith(serve(event.request)));
