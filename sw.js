const APP_VERSION = 'v1.5.0';
const STATIC_CACHE = `vivaqua-static-${APP_VERSION}`;
const TILES_CACHE  = `vivaqua-tiles-${APP_VERSION}`;
const CDN_CACHE    = `vivaqua-cdn-${APP_VERSION}`;

const STATIC_ASSETS = [
  './index.html',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
];

function getBrusselsPreloadTiles() {
  const tiles = [];
  const zoomLevels = [10, 11, 12, 13];
  zoomLevels.forEach(z => {
    const lat = 50.85, lng = 4.35;
    const n = Math.pow(2, z);
    const xCenter = Math.floor((lng + 180) / 360 * n);
    const yCenter = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    const radius = z <= 10 ? 1 : z <= 11 ? 2 : z <= 12 ? 3 : 4;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = xCenter + dx, y = yCenter + dy;
        if (x >= 0 && y >= 0 && x < n && y < n) {
          const sub = ['a','b','c'][Math.abs(x+y)%3];
          tiles.push(`https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
      }
    }
  });
  return tiles;
}

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache =>
        Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(()=>{})))
      ),
      caches.open(TILES_CACHE).then(cache =>
        Promise.allSettled(getBrusselsPreloadTiles().map(url => cache.add(url).catch(()=>{})))
      ),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('vivaqua-') && k !== STATIC_CACHE && k !== TILES_CACHE && k !== CDN_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('tile.openstreetmap.org')) { event.respondWith(tileStrategy(event.request)); return; }
  if (url.includes('open-meteo.com')) { event.respondWith(networkFirstStrategy(event.request, CDN_CACHE, 3000)); return; }
  if (url.includes('cdn.jsdelivr.net')) { event.respondWith(cacheFirstStrategy(event.request, CDN_CACHE)); return; }
  if (url.includes('.html') || url.endsWith('/')) { event.respondWith(networkFirstStrategy(event.request, STATIC_CACHE, 5000)); return; }
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try { const r = await fetch(request); if(r.ok) cache.put(request, r.clone()); return r; }
  catch { return new Response('Offline', {status:503}); }
}

async function tileStrategy(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const r = await fetch(request);
    if(r.ok) cache.put(request, r.clone());
    return r;
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8f0ee" opacity="0.5"/></svg>`;
    return new Response(svg, {headers:{'Content-Type':'image/svg+xml'}});
  }
}

async function networkFirstStrategy(request, cacheName, timeoutMs=5000) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(request, {signal: controller.signal});
    clearTimeout(timeout);
    if(r.ok) cache.put(request, r.clone());
    return r;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({error:'offline'}), {headers:{'Content-Type':'application/json'}});
  }
}
