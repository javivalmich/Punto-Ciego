/* Punto Ciego: caché para poder instalar la app y abrirla rápido. Red primero (siempre lo último publicado)
   y caché como respaldo sin conexión. Las partidas necesitan internet de todas formas.
   Al publicar una versión nueva, sube VERSION: el móvil descarga el sw.js nuevo, borra las cachés viejas
   y la página se recarga sola si está en la portada (ver el registro en index.html). */
const VERSION='1';
const CACHE='punto-ciego-v'+VERSION;
const SHELL=['./','index.html','manifest.json','privacidad.html','soporte.html','assets/logo.webp','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  e.respondWith(
    fetch(e.request,{cache:'no-cache'}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
      return res;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./')))
  );
});
