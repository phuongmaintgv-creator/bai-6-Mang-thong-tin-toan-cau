const CACHE_NAME = 'bai-6-mang-thong-tin-toan-cau-v1';
const VIDEO_URL = './BAI_6_MANG_THONG_TIN_TOAN_CAU.mp4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  VIDEO_URL
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(CORE_ASSETS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function rangeResponse(request, response) {
  const range = request.headers.get('range');
  if (!range || !response) return response;
  return response.arrayBuffer().then(buffer => {
    const size = buffer.byteLength;
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (!match) return response;
    const start = Number(match[1]);
    let end = match[2] ? Number(match[2]) : size - 1;
    if (start >= size) {
      return new Response(null, {status:416, headers:{'Content-Range':`bytes */${size}`}});
    }
    end = Math.min(end, size - 1);
    const chunk = buffer.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(chunk.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Type', 'video/mp4');
    return new Response(chunk, {status:206, statusText:'Partial Content', headers});
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/BAI_6_MANG_THONG_TIN_TOAN_CAU.mp4')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(VIDEO_URL).then(cached => {
          if (cached) return rangeResponse(request, cached.clone());
          return fetch(request).then(network => {
            if (network.ok && !request.headers.get('range')) cache.put(VIDEO_URL, network.clone());
            return network;
          });
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(network => {
      if (network.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, network.clone()));
      return network;
    }).catch(() => caches.match('./index.html')))
  );
});
