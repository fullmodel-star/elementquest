/* RL_FRESH_START — 2026-10-19 全家族「離線要有，但不能擋更新」（母版：04_管理工具\PWA新鮮度\rl_fresh_sw.js，用 apply.py 重新套用，不要在這裡手改）
   問題：原本 fetch 對網頁本身也是 cache-first → 重整先畫舊畫面、發新版要開兩次才看得到。
   做法：這段排在 sw.js 最前面、最先註冊 fetch：網頁／程式／樣式／資料（.html .js .mjs .css .json 與導覽）一律先拿線上最新的，
   4 秒沒回應或離線才用快取；成功時存一份到 rl-fresh 快取，離線也有最新版可用。
   圖片、字型、地圖圖磚等其他檔案不攔，交給原本的 handler（照舊 cache-first）。
   攔下的請求呼叫 stopImmediatePropagation()，原本的 fetch handler 不會再處理同一個請求。 */
(function(){
  var FRESH = 'rl-fresh';
  var CODE = /\.(?:html?|m?js|css|json|webmanifest)$/i;
  function fromCache(req){
    return caches.match(req).then(function(r){
      if (r) return r;
      return caches.match(req, { ignoreSearch: true }).then(function(r2){
        if (r2 || req.mode !== 'navigate') return r2;
        return caches.match('./').then(function(r3){ return r3 || caches.match('./index.html') || caches.match('index.html'); });
      });
    });
  }
  function fresh(e, req){
    var net = fetch(req).then(function(res){
      if (res && res.ok && res.type === 'basic'){
        var copy = res.clone();
        e.waitUntil(caches.open(FRESH).then(function(c){ return c.put(req, copy); }).catch(function(){}));
      }
      return res;
    });
    var timer = new Promise(function(resolve){ setTimeout(function(){ resolve(null); }, 4000); });
    return Promise.race([net.catch(function(){ return null; }), timer]).then(function(res){
      if (res && (res.ok || res.status === 304 || res.type === 'opaqueredirect')) return res;
      return fromCache(req).then(function(c){
        if (c) return c;
        return net.catch(function(){ return Response.error(); });   /* 快取也沒有：再等網路（可能只是慢） */
      });
    });
  }
  self.addEventListener('fetch', function(e){
    var req = e.request;
    if (req.method !== 'GET') return;
    var url; try { url = new URL(req.url); } catch (x) { return; }
    if (url.origin !== self.location.origin) return;
    if (url.pathname.indexOf('/api/') === 0) return;          /* 有自己 API 的 App（Worker）交給原本邏輯 */
    var isDoc = req.mode === 'navigate' || url.pathname.slice(-1) === '/' || CODE.test(url.pathname);
    if (!isDoc) return;
    if (url.pathname.slice(-6) === '/sw.js' || url.pathname === '/sw.js') return;
    e.stopImmediatePropagation();
    e.respondWith(fresh(e, req));
  });
})();
/* RL_FRESH_END */
const C='elementquest-campaign-20261107-v2';
const A=['assets/adventure/boss-aurora.svg','assets/adventure/boss-city.svg','assets/adventure/boss-flame.svg','assets/adventure/boss-forest.svg','assets/adventure/boss-forge.svg','assets/adventure/boss-mist.svg','assets/adventure/boss-stone.svg','assets/adventure/boss-throne.svg','assets/adventure/crown.svg','assets/adventure/item-aurora.svg','assets/adventure/item-city.svg','assets/adventure/item-flame.svg','assets/adventure/item-forest.svg','assets/adventure/item-forge.svg','assets/adventure/item-mist.svg','assets/adventure/item-stone.svg','assets/adventure/item-throne.svg','assets/adventure/scene-aurora.svg','assets/adventure/scene-city.svg','assets/adventure/scene-flame.svg','assets/adventure/scene-forest.svg','assets/adventure/scene-forge.svg','assets/adventure/scene-mist.svg','assets/adventure/scene-stone.svg','assets/adventure/scene-throne.svg','assets/adventure/spirit-al.svg','assets/adventure/spirit-ar.svg','assets/adventure/spirit-br.svg','assets/adventure/spirit-c.svg','assets/adventure/spirit-ca.svg','assets/adventure/spirit-cl.svg','assets/adventure/spirit-cr.svg','assets/adventure/spirit-cu.svg','assets/adventure/spirit-f.svg','assets/adventure/spirit-h.svg','assets/adventure/spirit-he.svg','assets/adventure/spirit-i.svg','assets/adventure/spirit-k.svg','assets/adventure/spirit-mg.svg','assets/adventure/spirit-na.svg','assets/adventure/spirit-ne.svg','assets/adventure/spirit-ni.svg','assets/adventure/spirit-o.svg','assets/adventure/spirit-pb.svg','assets/adventure/spirit-rn.svg','assets/adventure/spirit-u.svg','assets/adventure/spirit-zn.svg','adventure-data.js','adventure.js','adventure.css','assets/adventure/boron.svg','assets/adventure/compass.svg','assets/adventure/guardian.svg','assets/adventure/hero.svg','assets/adventure/iron.svg','assets/adventure/magnet.svg','assets/adventure/mentor.svg','assets/adventure/neodymium.svg','assets/adventure/scout.svg','assets/adventure/workshop.svg','./','index.html','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','icon.svg','favicon.svg','apple-touch-icon.png','rl-mark-denali-white.png','vendor/round-ui/eq-round.woff2','vendor/fluent-3d/alembic.webp','vendor/fluent-3d/balance.webp','vendor/fluent-3d/castle.webp','vendor/fluent-3d/compass.webp','vendor/fluent-3d/dagger.webp','vendor/fluent-3d/detective.webp','vendor/fluent-3d/fire.webp','vendor/fluent-3d/fog.webp','vendor/fluent-3d/gem.webp','vendor/fluent-3d/hammerpick.webp','vendor/fluent-3d/locked.webp','vendor/fluent-3d/magnet.webp','vendor/fluent-3d/map.webp','vendor/fluent-3d/microscope.webp','vendor/fluent-3d/nutbolt.webp','vendor/fluent-3d/radioactive.webp','vendor/fluent-3d/rock.webp','vendor/fluent-3d/scroll.webp','vendor/fluent-3d/shield.webp','vendor/fluent-3d/snowflake.webp','vendor/fluent-3d/swords.webp','vendor/fluent-3d/testtube.webp','vendor/fluent-3d/trophy.webp'];
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
