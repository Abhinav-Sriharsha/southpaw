/* South Paw · sw.js (service worker)
   Lets the game be installed as an app (Android and desktop Chrome ask for one) and opened without a connection.
   Network first: players always get the newest version when online; the saved copy is only used offline.
   See PROJECT_GUIDE.md. */
'use strict';
const CACHE='southpaw-v1';
const CDN=['cdnjs.cloudflare.com','cdn.jsdelivr.net'];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==self.location.origin&&!CDN.includes(u.hostname))return;   // matchmaking and everything else go straight to the network
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&(res.type==='basic'||res.type==='cors')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}
    return res;
  }).catch(()=>caches.match(r).then(m=>m||Response.error())));
});
