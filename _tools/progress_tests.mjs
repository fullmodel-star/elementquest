/**
 * 703 元素勇者・進度存檔測試（2026-10-24 新增；只測不改 App）
 *
 *   node _tools/progress_tests.mjs
 *   node _tools/progress_tests.mjs --override=index.html=<改壞的副本絕對路徑>   → 用副本取代 index.html（證明測試抓得到）
 *
 * 存檔：localStorage `elementquest_save_v2`（normalizeState 消毒）；舊版 `elementquest_save_v1`（68f4beb～3a1895e^：
 *   {known, weak, crafted, zoneCleared, inventory}）第一次打開時搬進 v2。
 * 1 背熟元素、王國試煉答 5 題（對 3 錯 2）、買配方線索、合成 3 樣（解鎖終極王國）→ 重新整理 → 整份存檔一字不差、
 *   熟練度與錯誤類型逐元素符合、結晶／收服／合成／破關數字、配方表、上次的王國、終極王國解鎖都還在
 * 2 本 App 沒有重做／清除功能：改測「玩一輪不會動到別的 key」（舊 v1 存檔、別支 App、共用經驗值錢包）
 * 3 舊版 v1 遷移、v2 早期形狀（缺 lastZone／recipeClues／研究室欄位）、欄位型別損壞、JSON 損壞、未來版本多出的欄位
 * 4 匯出匯入：本 App 沒有（確認頁面沒有這種按鈕）
 * 每條斷言印樣本數 n，n=0 一律 FAIL；外部連線一律擋下。puppeteer-core、headless new、埠 0、真實時間等待。
 * 注意：index.html 是 CRLF，本測試只讀不寫。
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const puppeteer = require('C:/Users/c0787/Desktop/App專案/02_其他App/700_學習計畫日曆/node_modules/puppeteer-core');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OVERRIDES = {};
for (const a of process.argv) if (a.startsWith('--override=')) { const [k, v] = a.slice(11).split('='); OVERRIDES['/' + k.replace(/^\/+/, '')] = v; }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const KEY = 'elementquest_save_v2', KEY1 = 'elementquest_save_v1';

let pass = 0, fail = 0;
function ok(name, cond, n, extra) {
  const empty = !(n > 0);
  const good = !!cond && !empty;
  if (good) pass++; else fail++;
  console.log(`  ${good ? 'ok  ' : 'FAIL'} ${name}  [n=${n}]${empty ? '（空集合）' : ''}` + (!good && extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 500) : ''));
}
function info(s) { console.log('  info ' + s); }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const server = createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let rel = decodeURIComponent(u.pathname);
  if (rel === '/__blank.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end('<!doctype html><title>blank</title>'); return; }
  if (rel.endsWith('/')) rel += 'index.html';
  const p = OVERRIDES[rel] || path.join(ROOT, rel);
  if (!OVERRIDES[rel] && !p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
const profile = await mkdtemp(path.join(tmpdir(), 'eq703-prog-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: profile,
  args: ['--no-first-run', '--no-default-browser-check', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1'] });

const external = [], pageErrors = [];
async function newPage() {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const h = (() => { try { return new URL(r.url()).hostname; } catch { return ''; } })();
    if (/^https?:/.test(r.url()) && h !== '127.0.0.1') { external.push(r.url()); r.abort(); } else r.continue();
  });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.message || e)));
  page.on('dialog', (d) => d.accept());
  page.__ctx = ctx;
  return page;
}
async function closePage(page) { try { await page.__ctx.close(); } catch {} }
async function seed(page, kv) {
  await page.goto(BASE + '__blank.html', { waitUntil: 'load' });
  await page.evaluate((kv) => { localStorage.clear(); for (const k in kv) localStorage.setItem(k, typeof kv[k] === 'string' ? kv[k] : JSON.stringify(kv[k])); }, kv);
}
async function dump(page, keys) { return page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])), keys); }
async function openApp(page) {
  const e0 = pageErrors.length;
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  const ready = await page.waitForFunction(() => document.querySelectorAll('#ovGrid .ov-cell.filled').length >= 118 && document.querySelectorAll('#homeZones .zone-card').length === 9,
    { timeout: 20000, polling: 150 }).then(() => true, () => false);
  return { ready, newErrors: pageErrors.slice(e0) };
}
const STAT_IDS = ['statOwned', 'statCraft', 'statZone', 'statCrystal'];
async function stats(page) { return page.evaluate((ids) => ids.map((i) => (document.getElementById(i) || {}).textContent), STAT_IDS); }
async function tab(page, t) { await page.evaluate((t) => document.querySelector(`nav.tabs button[data-tab="${t}"]`).click(), t); await sleep(150); }
async function craft(page, syms) {
  for (const s of syms) await page.evaluate((s) => [...document.querySelectorAll('#invGrid .inv-chip')].find((e) => e.textContent.startsWith(s + ' ')).click(), s);
  await page.evaluate(() => document.getElementById('btnCraft').click());
  await page.waitForFunction(() => !craftBusy, { timeout: 8000, polling: 150 });
}

const FOREIGN = { [KEY1]: { known: { Li: true }, weak: {}, crafted: {}, zoneCleared: {}, inventory: { Li: true } },
  ninja_xp_v1: { xp: 50, bySrc: { biology: 50 }, correct: 5, units: 0, jutsu: [], seen: { biology: 1 }, ts: 1 },
  biogsat_qb_v1: { rec: { a: { correct: true, n: 1 } }, wrong: [], fav: [], daily: {} } };
const ALL = [KEY, ...Object.keys(FOREIGN)];

try {
  console.log('對象：' + ROOT + (Object.keys(OVERRIDES).length ? '（覆寫 ' + JSON.stringify(OVERRIDES) + '）' : ''));

  /* ---------- 1 ---------- */
  console.log('\n[1 背熟→試煉 5 題（對 3 錯 2）→買線索→合成 3 樣 → 重新整理]');
  const page = await newPage();
  await seed(page, { ...FOREIGN, [KEY]: { crystals: 9 } });   // 只有結晶的最小 v2 存檔，讓線索買得起
  let o = await openApp(page);
  ok('1.0 能開、無例外、結晶讀到 9', o.ready && o.newErrors.length === 0 && (await stats(page))[3] === '9', 1, { o, st: await stats(page) });
  await page.evaluate(() => [...document.querySelectorAll('#homeZones .zone-card')].find((e) => e.textContent.includes('迷霧非金屬林')).click());
  await page.waitForFunction(() => (document.querySelector('section.active') || {}).id === 'tab-memorize', { timeout: 4000, polling: 100 });
  const poolSyms = await page.evaluate(() => battlePool('nonmetal').map((e) => e.sym));
  for (let i = 0; i < poolSyms.length + 5; i++) {
    const left = await page.evaluate(() => memQueue.length);
    if (!left) break;
    await page.evaluate(() => document.getElementById('btnKnow').click());
    await sleep(470);   // App 有 400ms 連點冷卻
  }
  let S = await page.evaluate(() => JSON.parse(localStorage.getItem('elementquest_save_v2')));
  const knownN = Object.keys(S.known).length;
  ok(`1.1 迷霧非金屬林 ${poolSyms.length} 個元素都背熟、進庫存`, knownN === poolSyms.length && poolSyms.every((s) => S.known[s] && S.inventory[s]) && S.lastZone === 'nonmetal', poolSyms.length, S);

  await tab(page, 'battle');
  await page.waitForFunction(() => document.querySelectorAll('#diffWrap .diff-card').length === 3, { timeout: 4000, polling: 100 });
  await page.evaluate(() => document.getElementById('btnStartBattle').click());
  await page.waitForFunction(() => battle && battle.active && document.querySelector('#battleOpts .opt'), { timeout: 4000, polling: 100 });
  const PATTERN = [true, false, true, false, true];
  const expM = {}, expE = {}, answered = [];
  for (const want of PATTERN) {
    const q = await page.evaluate(() => ({ sym: battle.current.sym, ans: battle.answer, et: battle.errType || 'symbol', opts: battle.opts.slice() }));
    const choice = want ? q.ans : q.opts.find((x) => x !== q.ans);
    await page.evaluate((c) => [...document.querySelectorAll('#battleOpts .opt')].find((o) => o.id !== 'battleHintBtn' && o.textContent === c).click(), choice);
    await page.waitForFunction(() => battle.answered === false || !battle.active, { timeout: 6000, polling: 100 });
    const m = expM[q.sym] || 0;
    expM[q.sym] = want ? Math.min(5, m + 1) : Math.max(0, m - 1);
    if (!want) { expE[q.sym] = expE[q.sym] || { symbol: 0, category: 0, equation: 0 }; expE[q.sym][q.et] = (expE[q.sym][q.et] || 0) + 1; }
    answered.push({ ...q, want });
  }
  S = await page.evaluate(() => JSON.parse(localStorage.getItem('elementquest_save_v2')));
  const mSyms = Object.keys(expM);
  ok(`1.2 試煉 ${answered.length} 題後存檔熟練度逐元素＝預期（${mSyms.length} 個元素）`, mSyms.every((s) => (S.mastery[s] || 0) === expM[s]) && Object.keys(S.mastery).every((s) => s in expM), mSyms.length, { mastery: S.mastery, expM });
  const eSyms = Object.keys(expE);
  ok(`1.3 答錯 ${PATTERN.filter((x) => !x).length} 題：錯誤類型統計逐元素＝預期`, eSyms.every((s) => eq(S.errorType[s], expE[s])) && Object.keys(S.errorType).length === eSyms.length, eSyms.length, { errorType: S.errorType, expE });

  await tab(page, 'craft');
  const c0 = S.crystals;
  await page.evaluate(() => document.getElementById('btnRecipeClue').click());
  await sleep(200);
  S = await page.evaluate(() => JSON.parse(localStorage.getItem('elementquest_save_v2')));
  const clueKeys = Object.keys(S.recipeClues);
  ok(`1.4 花 5 顆結晶買配方線索：結晶 ${c0}→${S.crystals}、線索 1 則`, S.crystals === c0 - 5 && clueKeys.length === 1 && S.recipeClues[clueKeys[0]].length === 1, clueKeys.length, { c0, S: S.recipeClues, cr: S.crystals });
  const CRAFTS = [['H', 'O', 'H₂O'], ['C', 'O', 'CO₂'], ['S', 'O', 'SO₂']];
  for (const [a, b] of CRAFTS) await craft(page, [a, b]);
  S = await page.evaluate(() => JSON.parse(localStorage.getItem('elementquest_save_v2')));
  ok(`1.5 合成 ${CRAFTS.length} 樣：crafted＝${CRAFTS.map((x) => x[2]).join('、')}`, eq(Object.keys(S.crafted).sort(), CRAFTS.map((x) => x[2]).sort()), Object.keys(S.crafted).length, S.crafted);
  const bossBefore = await page.evaluate(() => isZoneUnlocked('boss'));
  ok('1.6 合成 3 樣後終極王國解鎖', bossBefore === true, 1, bossBefore);

  const before = await dump(page, ALL);
  const stBefore = await stats(page);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#homeZones .zone-card').length === 9, { timeout: 20000, polling: 150 });
  const after = await dump(page, ALL);
  ok('1.7 重新整理後 v2 存檔一字不差', before[KEY] === after[KEY], before[KEY] ? before[KEY].length : 0, { before: before[KEY], after: after[KEY] });
  let live = await page.evaluate(() => JSON.stringify(state));
  ok('1.8 App 讀回的 state＝存檔', live === after[KEY], 1, live.slice(0, 200));
  const stAfter = await stats(page);
  ok(`1.9 頁首數字（收服/合成/破關/結晶）重整前後一致：${stAfter.join('/')}`, eq(stBefore, stAfter) && stAfter[0] === String(knownN) && stAfter[1] === '3' && stAfter[3] === String(S.crystals), 4, { stBefore, stAfter });
  const tabsOpen = await page.evaluate(() => ['memorize', 'craft', 'battle'].filter((t) => !document.querySelector(`nav.tabs button[data-tab="${t}"]`).classList.contains('locked')).length);
  ok('1.10 上次的王國恢復：背誦／合成台／試煉 3 個入口不用重選', tabsOpen === 3, 3, tabsOpen);
  const boss = await page.evaluate(() => { const b = [...document.querySelectorAll('#homeZones .zone-card')].find((e) => e.textContent.includes('禁忌放射王座')); return b ? b.classList.contains('locked') : null; });
  ok('1.11 終極王國重開後仍解鎖（卡片不是 locked）', boss === false, 1, boss);
  await tab(page, 'craft');
  const rl = await page.evaluate((clue) => ({ made: [...document.querySelectorAll('#recipeList .recipe-item.made')].map((e) => e.textContent), prog: document.getElementById('craftCollectProgress').textContent,
    clueItem: (() => { const r = RECIPES.find((x) => x.product === clue); const el = [...document.querySelectorAll('#recipeList .recipe-item')].find((e) => e.textContent.includes(r.name)); return el ? el.textContent : null; })() }), clueKeys[0]);
  ok('1.12 配方表：3 條已合成、圖鑑 3/47', rl.made.length === 3 && /已合成 3\/47/.test(rl.prog), rl.made.length, rl);
  const clueSym = S.recipeClues[clueKeys[0]][0];
  const clueShown = rl.clueItem && (S.crafted[clueKeys[0]] ? true : rl.clueItem.includes(clueSym));
  ok(`1.13 買到的線索（${clueKeys[0]} 的 ${clueSym}）重開後仍顯示在配方表`, !!clueShown, 1, rl.clueItem);
  const foreign = Object.keys(FOREIGN);
  ok(`2.1 玩完一輪＋重整：其他 ${foreign.length} 個 key（舊 v1 存檔、共用經驗值錢包、別支 App）一字不差`, foreign.every((k) => before[k] === after[k] && after[k] === JSON.stringify(FOREIGN[k])), foreign.length, foreign.filter((k) => after[k] !== JSON.stringify(FOREIGN[k])));
  const resetUi = await page.evaluate(() => [...document.querySelectorAll('button, [role=button]')].map((b) => b.textContent.trim()).filter((t) => /重置|重新開始|清除進度|清除存檔|刪除進度|匯出|匯入|備份|還原/.test(t)));
  const btnN = await page.evaluate(() => document.querySelectorAll('button, [role=button]').length);
  ok('2.2／4.1 頁面沒有清除進度、匯出匯入、備份按鈕（本 App 不提供，無從測還原）', resetUi.length === 0, btnN, resetUi);
  await closePage(page);

  /* ---------- 3 舊版與損壞 ---------- */
  console.log('\n[3 舊版 v1 遷移、早期 v2、型別損壞、JSON 損壞、未來欄位]');
  const p3 = await newPage();
  // 3a v1 → v2
  const V1 = { known: { H: true, O: true, Li: true }, weak: { H: 1 }, crafted: { 'H₂O': true }, zoneCleared: { noble: true }, inventory: { H: true, O: true, Li: true } };
  await seed(p3, { [KEY1]: V1 });
  o = await openApp(p3);
  let st = await stats(p3);
  let d = await dump(p3, [KEY, KEY1]);
  let S2 = JSON.parse(d[KEY] || 'null');
  ok('3a.1 只有 v1 舊存檔：能開、無例外、收服 3／合成 1／破關 1', o.ready && o.newErrors.length === 0 && eq(st, ['3', '1', '1', '0']), 3, { o, st });
  ok('3a.2 v1 搬進 v2：known/crafted/zoneCleared/inventory 一致，v1 原檔保留', !!S2 && eq(S2.known, V1.known) && eq(S2.crafted, V1.crafted) && eq(S2.zoneCleared, V1.zoneCleared) && eq(S2.inventory, V1.inventory) && d[KEY1] === JSON.stringify(V1), 4, d);
  await p3.reload({ waitUntil: 'load' });
  await p3.waitForFunction(() => document.querySelectorAll('#homeZones .zone-card').length === 9, { timeout: 20000, polling: 150 });
  ok('3a.3 再開一次（改讀 v2）數字不變', eq(await stats(p3), ['3', '1', '1', '0']), 4, await stats(p3));
  info('v1 的 weak 欄位搬進 v2 後原樣留著（normalizeState 不刪未知欄位），新版不使用');

  // 3b 3a1895e 時的 v2：沒有 lastZone／recipeClues／labSolved 等
  const V2OLD = { known: { Na: true, Cl: true }, mastery: { Na: 3, Cl: 1 }, errorType: { Cl: { symbol: 1 } }, crafted: { NaCl: true }, zoneCleared: {}, inventory: { Na: true, Cl: true }, crystals: 4 };
  await seed(p3, { [KEY]: V2OLD });
  o = await openApp(p3);
  st = await stats(p3);
  live = await p3.evaluate(() => state);
  ok('3b.1 早期 v2 形狀（缺 6 個新欄位）：能開、無例外、收服 2／合成 1／結晶 4', o.ready && o.newErrors.length === 0 && eq(st, ['2', '1', '0', '4']), 4, { o, st });
  ok('3b.2 熟練度保留、錯誤類型補齊成 3 欄、新欄位補預設', live.mastery.Na === 3 && live.mastery.Cl === 1 && eq(live.errorType.Cl, { symbol: 1, category: 0, equation: 0 }) && eq(live.recipeClues, {}) && live.lastZone === null && eq(live.labSolved, {}), 6, live);

  // 3c 型別損壞
  await seed(p3, { [KEY]: { known: { H: true }, mastery: { H: '9', O: -2, C: 'abc' }, crystals: '7', lastZone: 'atlantis', recipeClues: { 'H₂O': 'H', 'CO₂': ['C', 3] }, crafted: [], inventory: null, errorType: { H: 'x' } } });
  o = await openApp(p3);
  live = await p3.evaluate(() => state);
  ok('3c.1 欄位型別損壞：能開、無例外', o.ready && o.newErrors.length === 0, 1, o);
  ok('3c.2 消毒結果：熟練度夾到 0–5、結晶字串轉數字、不存在的王國清掉、線索只留字串、陣列/ null 改成空物件', live.mastery.H === 5 && live.mastery.O === 0 && live.mastery.C === 0 && live.crystals === 7 && live.lastZone === null &&
    eq(live.recipeClues, { 'H₂O': [], 'CO₂': ['C'] }) && eq(live.crafted, {}) && eq(live.inventory, {}) && eq(live.errorType.H, { symbol: 0, category: 0, equation: 0 }) && live.known.H === true, 9, live);

  // 3d JSON 損壞＋沒有 v1
  await seed(p3, { [KEY]: '{"known":{"H":tr' });
  o = await openApp(p3);
  st = await stats(p3);
  const raw3d = await p3.evaluate((k) => localStorage.getItem(k), KEY);
  ok('3d.1 v2 JSON 損壞：能開、無例外、以 0 起算', o.ready && o.newErrors.length === 0 && eq(st, ['0', '0', '0', '0']), 1, { o, st });
  ok('3d.2 損壞原始字串在玩家操作前不被覆寫', raw3d === '{"known":{"H":tr', 1, raw3d);

  // 3e JSON 損壞＋有 v1 → 規則不明
  await seed(p3, { [KEY]: '{"known":{"H":tr', [KEY1]: { known: { Li: true }, crafted: {}, zoneCleared: {}, inventory: { Li: true } } });
  o = await openApp(p3);
  st = await stats(p3);
  const raw3e = await p3.evaluate((k) => localStorage.getItem(k), KEY);
  ok('3e.1 v2 損壞且還留著 v1：能開、無例外', o.ready && o.newErrors.length === 0, 1, o);
  info(`3e v2 損壞時改讀 v1（收服 ${st[0]}），並把 v2 覆寫成 v1 內容：${raw3e === '{"known":{"H":tr' ? '否' : '是'}——v2 壞掉就退回很舊的 v1 進度、損壞的 v2 被蓋掉，是否預期：規則不明`);

  // 3f 未來版本多出的欄位：存檔後仍保留
  await seed(p3, { [KEY]: { known: { H: true }, inventory: { H: true }, lastZone: 'nonmetal', futureField: { a: 1 } } });
  o = await openApp(p3);
  await tab(p3, 'memorize');
  await p3.evaluate(() => document.getElementById('btnKnow').click());
  await sleep(300);
  const S3f = JSON.parse(await p3.evaluate((k) => localStorage.getItem(k), KEY));
  ok('3f.1 未來版本欄位：能開、背熟一張後寫檔，futureField 仍保留、收服 2', o.ready && o.newErrors.length === 0 && eq(S3f.futureField, { a: 1 }) && Object.keys(S3f.known).length === 2, 2, S3f);
  await closePage(p3);

  console.log('\n[5 外部連線]');
  ok('5.1 外部請求全部被擋（擋下 ' + external.length + ' 個；0 代表 App 不連外，以樣本 1 計）', true, 1);
  if (external.length) info('被擋的外部網址（前 3）：' + external.slice(0, 3).join(' , '));
  info('整輪頁面例外 ' + pageErrors.length + ' 個' + (pageErrors.length ? '：' + pageErrors.slice(0, 3).join(' | ') : ''));
} catch (e) {
  fail++;
  console.log('  FAIL 測試程式本身出錯：' + (e && e.stack || e));
} finally {
  console.log('\n' + (fail ? 'FAIL' : 'PASS') + '　通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
  try { await browser.close(); } catch {}
  server.close();
  await sleep(300);
  try { await rm(profile, { recursive: true, force: true }); } catch {}
  process.exit(fail ? 1 : 0);
}
