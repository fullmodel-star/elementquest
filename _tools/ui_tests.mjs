/**
 * 703 元素勇者 · 瀏覽器層功能走查（安全網）
 *
 *   node _tools/ui_tests.mjs                 → 對專案根目錄跑
 *   node _tools/ui_tests.mjs --dir=<資料夾>   → 對別的資料夾跑（例如改版前的備份）
 *
 * 2026-10-19 版面美化「勇者冒險」建立（這支之前只有 scripts/verify-game-data.js 驗資料與出題，沒有瀏覽器測試）。
 * 第 1～11 節是「功能照樣能用」：改版前的版本也要全過（先對改版前跑過一次確認）。
 * 第 12 節是新版面的檢查：改版前的版本應該失敗。
 *
 * 寫法照 605／609 踩過的坑：
 * - 不用 --virtual-time-budget；一律真實時間輪詢（until）。
 * - 自己起 http server（no-store），直接試綁埠、不先探測（Windows SO_REUSEADDR）。
 * - 3D 圖不用 img.complete 判斷（lazy 圖會假失敗），每種圖檔用 new Image() 實際載入一次。
 * - 每條斷言盡量印出樣本數，避免空集合假通過。
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const dirArg = process.argv.find((a) => a.startsWith('--dir='));
const ROOT = dirArg ? path.resolve(dirArg.slice(6)) : path.resolve(HERE, '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.txt': 'text/plain', '.woff2': 'font/woff2' };
const SAVE_KEY = 'elementquest_save_v2';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 400) : '')); }
}

async function startServer() {
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const rel = decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname);
    const p = path.join(ROOT, rel);
    if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    try {
      const b = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(b);
    } catch { res.writeHead(404); res.end(); }
  });
  for (let port = 8840; port < 8880; port++) {
    const okBind = await new Promise((resolve) => {
      server.once('error', () => resolve(false));
      server.listen(port, '127.0.0.1', () => resolve(true));
    });
    if (okBind) return { server, port };
  }
  throw new Error('找不到可用的埠');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiters = new Map(); this.errors = []; this.requests = []; this.initScript = null; }
  static async connect(debugPort) {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
        target = list.find((t) => t.type === 'page');
      } catch { /* Chrome 還沒起來 */ }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('接不上 Chrome 的 CDP');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const c = new CDP(ws);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && c.waiters.has(m.id)) { c.waiters.get(m.id)(m); c.waiters.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') {
        c.errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'unknown');
      }
      if (m.method === 'Network.requestWillBeSent') c.requests.push(m.params.request.url);
    };
    await c.send('Runtime.enable');
    await c.send('Page.enable');
    await c.send('Network.enable');
    return c;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res) => { this.waiters.set(id, res); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    return r.result?.result?.value;
  }
  async until(expr, ms = 8000, step = 150) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { if (await this.eval(expr)) return true; } catch { /* 還沒 ready */ }
      await sleep(step);
    }
    return false;
  }
  async width(w, h = 844) {
    await this.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    await sleep(200);
  }
  /** 開頁面：清本地資料（可放一份存檔），在頁面任何程式碼之前 */
  async open(url, { save = null } = {}) {
    if (this.initScript) await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.initScript });
    const r = await this.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
      try { if (!sessionStorage.getItem('__t')) { localStorage.clear(); ${save ? `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});` : ''} sessionStorage.setItem('__t','1'); } } catch(e) {}
    })();` });
    this.initScript = r.result && r.result.identifier;
    await this.eval(`try{sessionStorage.clear()}catch(e){}; 1`).catch(() => {});
    await this.send('Page.navigate', { url });
    return this.until(`document.querySelectorAll('#ovGrid .ov-cell.filled').length >= 118 && document.readyState==='complete'`, 15000);
  }
}

const { server, port } = await startServer();
const BASE = `http://127.0.0.1:${port}/`;
const profile = await mkdtemp(path.join(tmpdir(), 'eq703-ui-'));
const DEBUG_PORT = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
let c;
async function cleanup() {
  try { chrome.kill(); } catch {}
  server.close();
  await sleep(300);
  try { await rm(profile, { recursive: true, force: true }); } catch {}
}
const activeSection = `(document.querySelector('section.active')||{}).id`;
const tabBtn = (t) => `document.querySelector('nav.tabs button[data-tab="${t}"]')`;
// 回訪玩家：鹼金屬王國背熟兩個、H/O 在庫存、有結晶
const RETURNING = { known: { Li: true, Na: true, H: true, O: true }, inventory: { Li: true, Na: true, H: true, O: true },
  mastery: { Li: 2 }, crafted: {}, zoneCleared: { noble: true }, crystals: 7, lastZone: 'alkali' };

try {
  c = await CDP.connect(DEBUG_PORT);
  await c.width(390);

  console.log('\n[1 載入]');
  ok('1.1 週期表 118 格都畫出來', await c.open(BASE), await c.eval(`document.querySelectorAll('#ovGrid .ov-cell.filled').length`).catch(() => -1));
  ok('1.2 首頁是全貌總覽分頁', (await c.eval(activeSection)) === 'tab-overview', await c.eval(activeSection));
  const st = await c.eval(`['statOwned','statTotal','statCraft','statZone','statZoneTotal','statCrystal'].map(i=>(document.getElementById(i)||{}).textContent)`);
  ok('1.3 狀態數字（收服 0/56、合成 0、破關 0/9、結晶 0）', JSON.stringify(st) === JSON.stringify(['0', '56', '0', '0', '9', '0']), st);
  ok('1.4 第一次來：背誦／合成台／王國試煉三個入口是鎖住的', await c.eval(`['memorize','craft','battle'].every(t=>document.querySelector('nav.tabs button[data-tab="'+t+'"]').classList.contains('locked'))`));

  console.log('\n[2 鎖定提示]');
  await c.eval(`${tabBtn('memorize')}.click()`);
  const lk = await c.eval(`({hint:!document.getElementById('lockHint').hidden, sec:${activeSection}, txt:document.getElementById('lockHint').textContent})`);
  ok('2.1 點鎖住的「背誦」：不切頁，顯示說明（要先在地圖選王國）', lk.hint && lk.sec === 'tab-overview' && lk.txt.includes('選一個王國'), lk);
  await c.eval(`document.getElementById('btnLockGoMap').click()`);
  ok('2.2 說明裡的按鈕帶去地圖、說明收起', (await c.eval(activeSection)) === 'tab-map' && await c.eval(`document.getElementById('lockHint').hidden`));

  console.log('\n[3 地圖]');
  const zc = await c.eval(`document.querySelectorAll('#zoneGrid .zone-card').length`);
  ok('3.1 地圖有 9 個王國', zc === 9, zc);
  const boss = await c.eval(`(()=>{const b=[...document.querySelectorAll('#zoneGrid .zone-card')].find(e=>e.textContent.includes('禁忌放射王座')); return b?{locked:b.classList.contains('locked'), txt:b.textContent.replace(/\\s+/g,' ')}:null})()`);
  ok('3.2 終極王國（禁忌放射王座）鎖住，寫出解鎖條件（合成 3 樣）', !!boss && boss.locked && /合成\s*3\s*樣/.test(boss.txt), boss);
  await c.eval(`[...document.querySelectorAll('#zoneGrid .zone-card')].find(e=>e.textContent.includes('烈焰鹼金部落')).click()`);
  ok('3.3 點「烈焰鹼金部落」：進入背誦、三個入口解鎖', (await c.eval(activeSection)) === 'tab-memorize' &&
    await c.eval(`['memorize','craft','battle'].every(t=>!document.querySelector('nav.tabs button[data-tab="'+t+'"]').classList.contains('locked'))`));

  console.log('\n[4 背誦]');
  const sym0 = await c.eval(`document.getElementById('cardSym').textContent`);
  ok('4.1 翻牌卡顯示鹼金屬（Li/Na/K/Rb/Cs）', ['Li', 'Na', 'K', 'Rb', 'Cs'].includes(sym0), sym0);
  await c.eval(`document.getElementById('flashcard').click()`);
  ok('4.2 點卡片會翻面', await c.eval(`document.getElementById('flashcard').classList.contains('flipped')`));
  await sleep(450);
  await c.eval(`document.getElementById('btnKnow').click()`);
  ok('4.3 按「我記住了」：收服數 0→1', await c.until(`document.getElementById('statOwned').textContent==='1'`, 3000), await c.eval(`document.getElementById('statOwned').textContent`));

  console.log('\n[5 返回鍵]');
  await c.eval(`history.back()`);
  ok('5.1 返回鍵回上一個分頁（地圖），不是離開 App', await c.until(`${activeSection}==='tab-map'`, 3000), await c.eval(activeSection));

  console.log('\n[6 全貌總覽]');
  await c.eval(`${tabBtn('overview')}.click()`);
  const modeBtns = await c.eval(`[...document.querySelectorAll('#ovModeBar button')].map(b=>b.textContent.trim())`);
  ok('6.1 三種顯示模式（分類／部首／溫度）', modeBtns.length === 3 && /分類/.test(modeBtns[0]) && /部首/.test(modeBtns[1]) && /溫度/.test(modeBtns[2]), modeBtns);
  const bgCat = await c.eval(`getComputedStyle(document.querySelector('#ovGrid .ov-cell[data-sym="Na"]')).backgroundColor`);
  await c.eval(`document.querySelectorAll('#ovModeBar button')[1].click()`);
  const rad = await c.eval(`({zh:document.querySelector('#ovGrid .ov-cell[data-sym="Na"]').textContent.trim(), bg:getComputedStyle(document.querySelector('#ovGrid .ov-cell[data-sym="Na"]')).backgroundColor})`);
  ok('6.2 部首模式：格子改顯示中文名（鈉）、顏色改變', rad.zh === '鈉' && rad.bg !== bgCat, { rad, bgCat });
  await c.eval(`document.querySelectorAll('#ovModeBar button')[2].click()`);
  ok('6.3 溫度模式：出現溫度滑桿', await c.until(`!!document.querySelector('#decoderPanel input[type=range]') && getComputedStyle(document.getElementById('decoderPanel')).display!=='none'`, 2000));
  await c.eval(`document.querySelectorAll('#ovModeBar button')[0].click()`);
  await c.eval(`document.querySelector('#ovGrid .ov-cell[data-sym="Fe"]').click()`);
  const det = await c.eval(`({show:document.getElementById('ovDetail').classList.contains('show'), txt:document.getElementById('ovDetail').textContent})`);
  ok('6.4 點「Fe」顯示詳情卡（鐵、原子序 26）', det.show && det.txt.includes('鐵') && det.txt.includes('原子序 26'), det.txt.slice(0, 80));

  console.log('\n[7 合成台（回訪玩家存檔）]');
  await c.open(BASE, { save: RETURNING });
  const st2 = await c.eval(`['statOwned','statCraft','statZone','statCrystal'].map(i=>document.getElementById(i).textContent)`);
  ok('7.1 回訪玩家：狀態數字讀回存檔（收服 4、合成 0、破關 1、結晶 7）', JSON.stringify(st2) === JSON.stringify(['4', '0', '1', '7']), st2);
  ok('7.2 回訪玩家：上次的王國自動恢復，三個入口不用重選', await c.eval(`['memorize','craft','battle'].every(t=>!document.querySelector('nav.tabs button[data-tab="'+t+'"]').classList.contains('locked'))`));
  await c.eval(`${tabBtn('craft')}.click()`);
  const chips = await c.eval(`[...document.querySelectorAll('#invGrid .inv-chip')].map(e=>e.textContent.trim().split(' ')[0])`);
  ok('7.3 庫存列出 4 個元素', chips.length === 4, chips);
  await c.eval(`(()=>{const ch=[...document.querySelectorAll('#invGrid .inv-chip')]; ch.find(e=>e.textContent.startsWith('H ')).click(); return 1})()`);
  await c.eval(`(()=>{const ch=[...document.querySelectorAll('#invGrid .inv-chip')]; ch.find(e=>e.textContent.startsWith('O ')).click(); return 1})()`);
  ok('7.4 選 H、O 後「合成」可以按', await c.eval(`!document.getElementById('btnCraft').disabled`));
  await c.eval(`document.getElementById('btnCraft').click()`);
  ok('7.5 合成 H＋O：合成數 0→1', await c.until(`document.getElementById('statCraft').textContent==='1'`, 4000), await c.eval(`document.getElementById('statCraft').textContent`));
  const rf = await c.eval(`[...document.querySelectorAll('#recipeFilterRow button')].map(b=>b.textContent)`);
  ok('7.6 配方篩選 5 顆（全部 47）', rf.length === 5 && rf[0].includes('47'), rf);

  console.log('\n[8 王國試煉]');
  await c.eval(`${tabBtn('battle')}.click()`);
  ok('8.1 試煉先顯示三種難度', await c.until(`document.querySelectorAll('#diffWrap .diff-card').length===3`, 3000));
  await c.eval(`document.getElementById('btnStartBattle').click()`);
  const opts = await c.eval(`[...document.querySelectorAll('#battleOpts .opt')].filter(o=>o.id!=='battleHintBtn').length`);
  ok('8.2 開始試煉：出現題目與 2 個以上選項', opts >= 2 && (await c.eval(`document.getElementById('battleQ').textContent`)).length > 1, opts);
  await c.eval(`[...document.querySelectorAll('#battleOpts .opt')].find(o=>o.id!=='battleHintBtn').click()`);
  ok('8.3 作答後有回饋文字', await c.until(`/熟練度|上一題/.test(document.getElementById('battleLog').textContent)`, 3000), await c.eval(`document.getElementById('battleLog').textContent`));

  console.log('\n[9 研究室]');
  await c.eval(`${tabBtn('lab')}.click()`);
  const cases = await c.eval(`document.querySelectorAll('#caseGrid .lab-card').length`);
  ok('9.1 元素偵探 13 個案件', cases === 13, cases);
  await c.eval(`document.getElementById('btnLabBalance').click()`);
  ok('9.2 配平挑戰列表出現', await c.until(`getComputedStyle(document.getElementById('labBalance')).display!=='none' && document.getElementById('labBalance').querySelectorAll('.lab-card').length>=10`, 3000),
    await c.eval(`document.getElementById('labBalance').querySelectorAll('.lab-card').length`));

  console.log('\n[10 版面基本]');
  for (const w of [390, 1440]) {
    await c.width(w, w < 600 ? 844 : 900);
    await c.open(BASE);
    const hs = await c.eval(`document.documentElement.scrollWidth - window.innerWidth`);
    ok(`10.1 ${w}px 沒有水平捲動（多出 ${hs}px）`, hs <= 1, hs);
  }
  await c.width(390);

  console.log('\n[12 勇者冒險版面（2026-10-19）]');
  await c.open(BASE);
  const hero = await c.eval(`(()=>{const h=document.querySelector('.eq-hero'); if(!h) return null; const r=h.getBoundingClientRect(); const b=document.getElementById('btnStartTop');
    return {top:Math.round(r.top), bottom:Math.round(r.bottom), title:(h.querySelector('h2')||{}).textContent, btnIn:!!b && h.contains(b), btn:b&&b.textContent.trim(),
      primaries:[...document.querySelectorAll('button')].filter(x=>{const rr=x.getBoundingClientRect(); return x.offsetParent && rr.top<844 && getComputedStyle(x).backgroundColor===getComputedStyle(b).backgroundColor}).length}})()`);
  ok('12.1 首屏主視覺：大標「勇者，今天征服哪個王國？」、主鈕在卡內、第一屏只有一顆金色主鈕', !!hero && /勇者.*今天征服哪個王國/.test(hero.title.replace(/\s/g, '')) && hero.btnIn && hero.top < 260 && hero.primaries === 1, hero);
  const art = await c.eval(`(()=>{const h=document.querySelector('.eq-hero'); if(!h) return null; const arts=[...h.querySelectorAll('.eq-hero-art img')].map(i=>i.getBoundingClientRect());
    const txt=[...h.querySelectorAll('h2,p,.eq-xp,.eq-xpl,#btnStartTop,.eq-kicker')].map(e=>e.getBoundingClientRect());
    const hit=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1; let n=0; arts.forEach(a=>txt.forEach(t=>{if(hit(a,t))n++})); return {arts:arts.length, txt:txt.length, overlap:n}})()`);
  ok('12.2 主視覺插圖不壓字（插圖 × 文字區塊重疊 0）', !!art && art.arts >= 1 && art.txt >= 4 && art.overlap === 0, art);
  await c.eval(`document.fonts.ready`);
  const font = await c.until(`[...document.fonts].some(f=>f.family.replace(/"/g,'')==='EQRound' && f.status==='loaded')`, 6000);
  const fam = await c.eval(`[ '.eq-hero h2', 'nav.tabs button', '#btnStartTop' ].map(s=>{const e=document.querySelector(s); return e?getComputedStyle(e).fontFamily:''})`);
  ok('12.3 粉圓子集字型（EQRound）有載入，大標／入口／主鈕都用它', font && fam.every((f) => /EQRound/.test(f)), { font, fam });
  const f3 = await c.eval(`(async()=>{const srcs=[...new Set([...document.querySelectorAll('img[src*="fluent-3d"]')].map(i=>i.getAttribute('src')))];
    const res=await Promise.all(srcs.map(s=>new Promise(ok=>{const im=new Image(); im.onload=()=>ok(im.naturalWidth>0?null:s); im.onerror=()=>ok(s); im.src=s;})));
    return {n:srcs.length, broken:res.filter(Boolean)}})()`);
  ok('12.4 頁面用到的 3D 圖檔（' + f3.n + ' 種）全部載得出來', f3.n >= 15 && f3.broken.length === 0, f3);
  const emo = await c.eval(`(()=>{const sel='nav.tabs button, #btnStartTop, .stat-bar, #ovModeBar button, #recipeFilterRow button, .mode-bar button, #lockHint, section button.action, .eq-hero';
    const els=[...document.querySelectorAll(sel)]; const bad=els.map(e=>e.textContent||'').filter(t=>/\\p{Extended_Pictographic}/u.test(t));
    return {n:els.length, bad:bad.slice(0,5)}})()`);
  ok('12.5 入口圖格、主視覺、狀態列、模式切換與分頁內按鈕（' + emo.n + ' 個）文字沒有 emoji（圖改用 3D 圖檔）', emo.n >= 20 && emo.bad.length === 0, emo);
  const tiles = await c.eval(`[...document.querySelectorAll('nav.tabs button')].map(b=>({t:b.dataset.tab, img:!!b.querySelector('img[src*="fluent-3d"]'), op:+getComputedStyle(b).opacity, lock:b.classList.contains('locked'),
    badge:b.classList.contains('locked') ? getComputedStyle(b,'::after').backgroundImage : '', cond:(b.querySelector('.eq-cond')||{}).offsetParent ? b.querySelector('.eq-cond').textContent : ''}))`);
  const lockedT = tiles.filter((t) => t.lock);
  ok('12.6 六個入口都是 3D 圖格；鎖住的 ' + lockedT.length + ' 個不灰掉（不透明度 1）、右上有鎖頭、寫出解鎖條件',
    tiles.length === 6 && tiles.every((t) => t.img && t.op === 1) && lockedT.length === 3 && lockedT.every((t) => /locked/.test(t.badge) && /選.*王國/.test(t.cond)), tiles);
  const kg = await c.eval(`(()=>{const k=[...document.querySelectorAll('#homeZones .zone-card')]; return {n:k.length, img:k.filter(e=>e.querySelector('img[src*="fluent-3d"]')).length, chips:k.map(e=>e.querySelectorAll('.eq-el i').length),
    boss:(k.find(e=>e.textContent.includes('禁忌放射王座'))||{}).className, op:k.map(e=>+getComputedStyle(e).opacity)}})()`);
  ok('12.7 首頁「九大王國」9 張卡，每張有 3D 圖與元素符號，終極王國鎖住但不灰掉', kg.n === 9 && kg.img === 9 && kg.chips.every((x) => x >= 1) && /locked/.test(kg.boss || '') && kg.op.every((o) => o === 1), kg);
  const howto = await c.eval(`(()=>{const d=document.querySelector('details.eq-howto'); return d?{open:d.open, has:d.textContent.includes('元素週期表')}:null})()`);
  ok('12.8 長說明收進「怎麼玩」（預設收起）', !!howto && !howto.open && howto.has, howto);
  const cell = await c.eval(`(()=>{const e=document.querySelector('#ovGrid .ov-cell[data-sym="Na"]'); const cs=getComputedStyle(e); const m=cs.backgroundColor.match(/\\d+/g).map(Number);
    const [r,g,b]=m; const mx=Math.max(r,g,b)/255, mn=Math.min(r,g,b)/255; const L=(mx+mn)/2; return {bg:cs.backgroundColor, color:cs.color, L:+L.toFixed(2)}})()`);
  ok('12.9 週期表分類色收斂：格子是深色調（亮度 ≤ .45）、字是淺色', cell.L <= 0.45 && /rgb\(2[0-9]{2}/.test(cell.color), cell);
  // 換分頁：主視覺收起、分頁內容在第一屏開始
  await c.eval(`${tabBtn('map')}.click()`);
  const sw = await c.eval(`(()=>{const h=document.querySelector('.eq-hero'); const s=document.getElementById('tab-map').getBoundingClientRect(); return {hero:!!h, heroShown:!!h && !!h.offsetParent, secTop:Math.round(s.top + scrollY)}})()`);
  ok('12.10 手機換到「地圖」：主視覺收起、地圖內容從第一屏開始（top ' + sw.secTop + 'px）', sw.hero && !sw.heroShown && sw.secTop < 520, sw);
  await c.open(BASE, { save: RETURNING });
  const cont = await c.eval(`({btn:document.getElementById('btnStartTop').textContent.trim(), kick:(document.querySelector('.eq-kicker')||{}).textContent, xp:(document.querySelector('.eq-xpl')||{}).textContent})`);
  ok('12.11 回訪玩家：主鈕變「繼續冒險」、寫出目前王國與破關進度（1 / 9）', /繼續冒險/.test(cont.btn) && /烈焰鹼金部落/.test(cont.kick || '') && /1\s*\/\s*9/.test(cont.xp || ''), cont);
  await c.eval(`document.getElementById('btnStartTop').click()`);
  ok('12.12 回訪玩家按主鈕：直接回到該王國的背誦', (await c.eval(activeSection)) === 'tab-memorize', await c.eval(activeSection));
  await c.width(1440, 900);
  await c.open(BASE);
  const d = await c.eval(`(()=>{if(!document.querySelector('.eq-hero')) return {}; const h=document.querySelector('.eq-hero').getBoundingClientRect(), n=document.querySelector('nav.tabs').getBoundingClientRect(), k=document.getElementById('homeZones').getBoundingClientRect();
    const cards=[...document.querySelectorAll('#homeZones .zone-card')].slice(0,3).map(e=>Math.round(e.getBoundingClientRect().top));
    return {hR:Math.round(h.right), nL:Math.round(n.left), hT:Math.round(h.top), nT:Math.round(n.top), kW:Math.round(k.width), cards, app:Math.round(document.getElementById('app').getBoundingClientRect().width)}})()`);
  ok('12.13 1440px 桌機：主視覺與入口圖格左右兩欄並排、王國卡一列至少 3 張、內容寬 ≥ 1100', d.hR > 0 && d.hR <= d.nL && Math.abs(d.hT - d.nT) < 40 && (d.cards||[]).length === 3 && d.cards[0] === d.cards[2] && d.app >= 1100, d);
  await c.open(BASE, { save: RETURNING });
  await c.eval(`document.querySelector('nav.tabs button[data-tab="craft"]').click()`);
  const cw = await c.eval(`(()=>{const a=document.querySelector('#tab-craft .slot-row').getBoundingClientRect(), b=document.getElementById('recipeList').getBoundingClientRect(); return {slotR:Math.round(a.right), listL:Math.round(b.left), listW:Math.round(b.width)}})()`);
  ok('12.14 1440px 合成台兩欄：合成槽在左、配方表在右', cw.listL >= cw.slotR && cw.listW > 400, cw);
  await c.width(390);

  console.log('\n[11 沒有錯誤、沒有對外連線]');
  ok('11.1 沒有未捕捉的 JS 例外', c.errors.length === 0, c.errors.slice(0, 3));
  const hosts = [...new Set(c.requests.filter((u) => /^https?:/i.test(u)).map((u) => new URL(u).hostname))];
  ok('11.2 只連本機（實際主機：' + hosts.join(', ') + '）', hosts.length >= 1 && hosts.every((h) => h === '127.0.0.1'), hosts);
} catch (e) {
  fail++;
  console.log('  FAIL 測試程式本身出錯：' + (e && e.stack || e));
} finally {
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + '　通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  await cleanup();
  process.exit(fail ? 1 : 0);
}
