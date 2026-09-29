const C='elementquest-v11';
const A=['./','index.html','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','icon.svg','favicon.svg','apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const isNav = e.request.mode==='navigate' || e.request.url.endsWith('/index.html') || e.request.url.endsWith('/');
  if(isNav){
    // 導覽請求（HTML）優先拿最新版本，離線或連不上才退回快取，避免長期只看到舊版頁面
    e.respondWith(fetch(e.request).then(r=>{
      caches.open(C).then(c=>c.put(e.request, r.clone())).catch(()=>{});
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
    return;
  }
  // 其餘靜態資源（icon/manifest等）維持 cache-first，減少離線時的閃爍與流量
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING'||e.data==='skipWaiting'||(e.data&&e.data.type==='SKIP_WAITING'))self.skipWaiting()});
