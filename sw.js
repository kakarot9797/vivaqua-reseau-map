// ================================================================
// VIVAQUA — Service Worker v1.0
// Cache stratégique : static assets + tuiles OSM Bruxelles
// ================================================================

const APP_VERSION = 'v1.0.0';
const STATIC_CACHE = `vivaqua-static-${APP_VERSION}`;
const TILES_CACHE  = `vivaqua-tiles-${APP_VERSION}`;
const CDN_CACHE    = `vivaqua-cdn-${APP_VERSION}`;

// Ressources à pré-cacher au premier chargement
const STATIC_ASSETS = [
  './vivaqua_v14.html',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://api.open-meteo.com/v1/forecast?latitude=50.85&longitude=4.35&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Brussels',
];

// Tuiles OSM pré-chargées pour Bruxelles (zoom 10-13)
// Centre: 50.85°N, 4.35°E
function getBrusselsPreloadTiles() {
  const tiles = [];
  const zoomLevels = [10, 11, 12, 13];

  zoomLevels.forEach(z => {
    const lat = 50.85, lng = 4.35;
    const n = Math.pow(2, z);
    const xCenter = Math.floor((lng + 180) / 360 * n);
    const yCenter = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

    // Rayon de tuiles selon le zoom
    const radius = z <= 10 ? 1 : z <= 11 ? 2 : z <= 12 ? 3 : 4;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = xCenter + dx;
        const y = yCenter + dy;
        if (x >= 0 && y >= 0 && x < n && y < n) {
          const sub = ['a', 'b', 'c'][Math.abs(x + y) % 3];
          tiles.push(`https://${sub}.tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
      }
    }
  });

  return tiles;
}

// ===== INSTALL — pré-cache tout =====
self.addEventListener('install', event => {
  console.log('[SW] Install', APP_VERSION);
  event.waitUntil(
    Promise.all([
      // Cache statique
      caches.open(STATIC_CACHE).then(cache => {
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
          )
        );
      }),
      // Pré-cache tuiles Bruxelles
      caches.open(TILES_CACHE).then(cache => {
        const tiles = getBrusselsPreloadTiles();
        console.log(`[SW] Pre-caching ${tiles.length} OSM tiles for Brussels`);
        return Promise.allSettled(
          tiles.map(url =>
            cache.add(url).catch(() => {}) // Silencieux si pas de réseau
          )
        );
      }),
    ]).then(() => {
      console.log('[SW] Pre-cache complete');
      return self.skipWaiting();
    })
  );
});

// ===== ACTIVATE — nettoyer les anciens caches =====
self.addEventListener('activate', event => {
  console.log('[SW] Activate', APP_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith('vivaqua-') &&
            key !== STATIC_CACHE &&
            key !== TILES_CACHE &&
            key !== CDN_CACHE
          )
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH — stratégie par type de ressource =====
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 1. Tuiles OSM — Cache First (offline OK)
  if (url.includes('tile.openstreetmap.org')) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // 2. API Météo — Network First avec fallback cache
  if (url.includes('open-meteo.com')) {
    event.respondWith(networkFirstStrategy(event.request, CDN_CACHE, 3000));
    return;
  }

  // 3. CDN Leaflet/MarkerCluster — Cache First
  if (url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com')) {
    event.respondWith(cacheFirstStrategy(event.request, CDN_CACHE));
    return;
  }

  // 4. HTML principal — Network First avec fallback
  if (url.includes('.html') || url === self.location.origin + '/') {
    event.respondWith(networkFirstStrategy(event.request, STATIC_CACHE, 5000));
    return;
  }

  // 5. Tout le reste — Network with cache fallback
  event.respondWith(networkFallbackStrategy(event.request));
});

// ===== STRATÉGIES =====

// Cache First — sert depuis cache, fetch si absent
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

// Tile Strategy — Cache First avec timeout + stockage automatique
async function tileStrategy(request) {
  const cache = await caches.open(TILES_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Tuile grise transparente si hors ligne
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8f0ee" opacity="0.5"/></svg>`;
    return new Response(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}

// Network First — essaie le réseau, fallback cache si timeout
async function networkFirstStrategy(request, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Network with fallback — pas de cache actif, mais stocke pour plus tard
async function networkFallbackStrategy(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ===== MESSAGE — mise à jour manuelle =====
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.source.postMessage({ version: APP_VERSION });
  }
});
