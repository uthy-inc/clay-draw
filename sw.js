const CACHE_NAME = 'clay-draw-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './css/styles.css',
  './js/main.js',
  './js/canvasEngine.js',
  './js/tools.js',
  './js/history.js',
  './js/colors.js',
  './js/pwa.js',
  './js/timezones.js',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  // Precache social icons used by CSS for offline rendering
  './icons/social/fb.svg',
  './icons/social/ig.svg',
  './icons/social/tg.svg',
  './icons/social/x.svg',
  './icons/social/wa.svg',
  './icons/social/mail.svg',
  './icons/social/discord.svg',
  './icons/social/github.svg'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME&&caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const { request } = e;
  // Network-first for APIs, cache-first for static
  if (request.url.includes('worldtimeapi.org')) {
    e.respondWith(
      fetch(request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(request, clone));
        return res;
      }).catch(()=>caches.match(request))
    );
  } else {
    e.respondWith(
      caches.match(request).then(cached=> cached || fetch(request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(request, clone));
        return res;
      }))
    );
  }
});