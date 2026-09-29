#!/usr/bin/env node
/*
 * 元素勇者：週期表大冒險 — 本機資料/出題自動檢查（無 build 流程，純 Node 讀 index.html）
 *
 * 做法：從 index.html 抽出「資料與出題引擎」那一段原始碼（ELEMENTS ... nextBattleQuestion，
 * 不含任何 DOM 渲染的呼叫），在 vm 沙箱裡用最小的 document/localStorage 假物件執行，
 * 讓 ELEMENTS/ZONES/RECIPES 等資料與 nextBattleQuestion() 出題邏輯就是「正式程式碼本身」，
 * 而不是另外用 regex/手寫規則重新描述一次（避免驗證腳本跟真正邏輯長期漂移）。
 *
 * 用法：node scripts/verify-game-data.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX_PATH = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(INDEX_PATH, 'utf8');

const START_MARK = 'const ELEMENTS = [';
const END_MARK = 'const QTYPE_LABEL';
const startIdx = html.indexOf(START_MARK);
const endIdx = html.indexOf(END_MARK, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error(`❌ 找不到資料區段（${START_MARK} ... ${END_MARK}），index.html 結構可能已改動，請更新本腳本的擷取標記。`);
  process.exit(1);
}
const engineSrc = html.slice(startIdx, endIdx);

// ---------- 最小 DOM / localStorage / navigator 假物件 ----------
// 只需要讓「資料定義＋出題邏輯」那段程式的頂層陳述式（例如 document.getElementById(...).addEventListener(...)）
// 不會噴錯即可；畫面渲染函式（renderOverview 等）在這裡只是被定義、不會被呼叫，所以不需要更完整的 DOM。
function fakeStyleProxy() {
  const store = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop === 'setProperty') return (k, v) => { target[k] = v; };
      if (prop === 'removeProperty') return (k) => { delete target[k]; };
      return prop in target ? target[prop] : '';
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}
function fakeElement() {
  return {
    style: fakeStyleProxy(),
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    dataset: {},
    children: [],
    textContent: '', innerHTML: '', className: '', title: '',
    disabled: false, tabIndex: 0,
    addEventListener(){}, removeEventListener(){},
    appendChild(c){ this.children.push(c); return c; },
    setAttribute(){}, getAttribute(){ return null; },
    querySelectorAll(){ return []; }, querySelector(){ return null; },
    scrollIntoView(){}, remove(){}, focus(){},
  };
}
const fakeDocument = {
  getElementById(){ return fakeElement(); },
  querySelectorAll(){ return []; },
  createElement(){ return fakeElement(); },
};
const fakeLocalStorage = { getItem(){ return null; }, setItem(){}, removeItem(){} };

// ---------- 資料驗證 + 出題模擬，全部在同一段 vm 腳本內完成（用 var 讓結果掛在 sandbox 上可讀回） ----------
const harnessSrc = `
var __dataErrors = [];
function check(cond, msg){ if(!cond) __dataErrors.push(msg); }

check(ELEMENTS.length === 56, 'ELEMENTS（教學元素）數量應為 56，實際 ' + ELEMENTS.length);
check(FULL_ELEMENTS.length === 118, 'FULL_ELEMENTS 數量應為 118，實際 ' + FULL_ELEMENTS.length);
check(RECIPES.length === 47, 'RECIPES 數量應為 47，實際 ' + RECIPES.length);

(function(){
  var seen = {};
  ELEMENTS.forEach(function(e){
    if(seen[e.sym]) __dataErrors.push('ELEMENTS 符號重複：' + e.sym);
    seen[e.sym] = true;
  });
})();
(function(){
  var seen = {};
  FULL_ELEMENTS.forEach(function(e){
    if(seen[e.sym]) __dataErrors.push('FULL_ELEMENTS 符號重複：' + e.sym);
    seen[e.sym] = true;
  });
})();

var zoneKeys = {};
ZONES.forEach(function(z){ zoneKeys[z.key] = true; });
ELEMENTS.forEach(function(e){
  if(!e.zone || !zoneKeys[e.zone]) __dataErrors.push(e.sym + ' 的 zone「' + e.zone + '」不存在於 ZONES');
  ['sym','zh','cat','zone','fact'].forEach(function(field){
    var v = e[field];
    if(v === undefined || v === null || v === '') __dataErrors.push(e.sym + ' 缺少欄位 ' + field);
  });
});

var elementSyms = {};
ELEMENTS.forEach(function(e){ elementSyms[e.sym] = true; });
RECIPES.forEach(function(r){
  r.r.forEach(function(sym){
    if(!elementSyms[sym]) __dataErrors.push('配方 ' + r.product + ' 用到的材料 ' + sym + ' 不存在於教學元素 ELEMENTS');
  });
});
(function(){
  var seen = {};
  RECIPES.forEach(function(r){
    var key = r.r.slice().sort().join(',');
    if(seen[key]) __dataErrors.push('配方輸入組合重複：' + key + '（' + seen[key] + ' / ' + r.product + '）');
    seen[key] = r.product;
  });
})();

// ---------- 找碴題窮舉：每個反應配方 × 每個可被換掉的元素 × 每個候選錯誤元素，換完的方程式不可是真實化學 ----------
// 這份清單刻意用 ASCII 另寫一份，不引用 index.html 的 REAL_LOOKALIKE_PRODUCTS，
// 這樣即使有人改掉程式裡的過濾條件或清單，這裡仍會獨立抓到
var __eqErrors = [];
var __eqCombos = 0;
var __eqNoCandidate = [];
(function(){
  var KNOWN_REAL = ('B2O3 As2O3 Sb2O3 BCl3 PCl3 AsCl3 SbCl3 CCl4 SiCl4 GeCl4 TeCl4 SeCl4 GeCl2 TeCl2 SeCl2 SCl2 ' +
    'CeO2 PbO2 PtO2 UO2 WO2 GeO2 SeO2 TeO2 GeO GeS AsS XeF2 KrF2 GeF2 OF2 F2O NO NO2 N2O N2O3 NCl3 Cl2O ClO2 Br2O ' +
    'H2S HI ICl ClI ICl3 BrCl FCl BrI Li2O Cu2O Ag2O Rb2O Cs2O LiCl CuCl AgCl AuCl CsCl RbCl InCl NLi3 AlH3 UH3 ' +
    'CsO2 RbO2 HLi HNa HK HCs HRb').split(' ');
  var SUB = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
  function ascii(s){ return s.replace(/[₀-₉]/g, function(c){ return SUB[c]; }); }
  RECIPES.filter(function(r){ return r.type==='reaction'; }).forEach(function(recipe){
    recipe.r.forEach(function(rightSym){
      var cands = equationWrongCandidates(recipe, rightSym);
      if(cands.length===0) __eqNoCandidate.push(recipe.name + '（換 ' + rightSym + '）');
      cands.forEach(function(w){
        __eqCombos++;
        var fake = recipe.eq.split(rightSym).join(w.sym);
        var prod = ascii(fake.split('→')[1]).trim().replace(/^\\d+\\s*/, '');
        if(KNOWN_REAL.indexOf(prod) !== -1) __eqErrors.push('「' + fake + '」是真實存在的化學反應，不能當找碴題（原配方：' + recipe.name + '）');
        if(new RegExp(rightSym + '[a-z]').test(recipe.eq.replace(new RegExp(rightSym + '(?![a-z])','g'), ''))) __eqErrors.push(recipe.name + '：換 ' + rightSym + ' 時會誤換到其他元素符號的一部分');
      });
    });
  });
})();

// ---------- 出題模擬：讓每個王國都在「已學完全部教學元素」狀態下，實際呼叫 nextBattleQuestion 兩千次 ----------
var __simErrors = [];
var __qtypeCounts = {};
var __simCount = 0;
(function simulate(){
  state.known = {};
  ELEMENTS.forEach(function(e){ state.known[e.sym] = true; });
  state.mastery = {};
  var zoneList = ZONES.map(function(z){ return z.key; });
  for(var i=0;i<2000;i++){
    var zoneKey = zoneList[i % zoneList.length];
    var pool = zoneElements(zoneKey);
    if(pool.length===0) continue;
    battle = { pool: pool, zone: zoneKey };
    nextBattleQuestion();
    __simCount++;
    __qtypeCounts[battle.qtype] = (__qtypeCounts[battle.qtype]||0) + 1;
    var tag = '第' + i + '題（' + zoneKey + '/' + battle.qtype + '）';
    if(!battle.opts || battle.opts.indexOf(battle.answer) === -1){
      __simErrors.push(tag + '：answer 不在 opts 內 → ' + JSON.stringify({qtext:battle.qtext, opts:battle.opts, answer:battle.answer}));
      continue;
    }
    var uniq = {}, dup = false;
    battle.opts.forEach(function(o){ if(uniq[o]) dup = true; uniq[o] = true; });
    if(dup) __simErrors.push(tag + '：opts 有重複選項 → ' + JSON.stringify(battle.opts));
    if(battle.opts.length < 2 || battle.opts.length > 4) __simErrors.push(tag + '：opts 數量不合理（' + battle.opts.length + '）');
  }
})();
`;

const sandbox = {
  document: fakeDocument,
  localStorage: fakeLocalStorage,
  navigator: {},
  console,
};
vm.createContext(sandbox);
try {
  vm.runInContext(engineSrc + '\n' + harnessSrc, sandbox, { filename: 'index.html(engine slice)' });
} catch (err) {
  console.error('❌ 執行資料/出題引擎時發生例外（可能是 index.html 語法或結構已改動）：');
  console.error(err.stack || err.message);
  process.exit(1);
}

const dataErrors = sandbox.__dataErrors || [];
const simErrors = sandbox.__simErrors || [];
const simCount = sandbox.__simCount || 0;
const qtypeCounts = sandbox.__qtypeCounts || {};
const eqErrors = sandbox.__eqErrors || [];
const eqCombos = sandbox.__eqCombos || 0;
const eqNoCandidate = sandbox.__eqNoCandidate || [];

console.log('=== 資料檢查 ===');
if (dataErrors.length === 0) {
  console.log('✅ ELEMENTS/FULL_ELEMENTS/ZONES/RECIPES 全數通過檢查');
} else {
  dataErrors.forEach(msg => console.log('❌ ' + msg));
}

console.log('\n=== 出題模擬（' + simCount + ' 題） ===');
console.log('題型分佈：' + JSON.stringify(qtypeCounts));
if (simErrors.length === 0) {
  console.log('✅ 每題 answer 都在 opts 內、opts 無重複、選項數量合理');
} else {
  simErrors.slice(0, 30).forEach(msg => console.log('❌ ' + msg));
  if (simErrors.length > 30) console.log(`...其餘 ${simErrors.length - 30} 筆省略`);
}

console.log('\n=== 找碴題窮舉（' + eqCombos + ' 種換法） ===');
if (eqCombos === 0) eqErrors.push('窮舉到 0 種換法，檢查沒有實際執行');
if (eqErrors.length === 0) {
  console.log('✅ 沒有任何一種換法會變成真實存在的化學反應');
} else {
  eqErrors.slice(0, 30).forEach(msg => console.log('❌ ' + msg));
  if (eqErrors.length > 30) console.log(`...其餘 ${eqErrors.length - 30} 筆省略`);
}
if (eqNoCandidate.length) console.log('ℹ️ 這些情況找不到可用的錯誤元素，會自動改出其他題型：' + eqNoCandidate.join('、'));

// ---------- 研究室（解碼器／偵探／配平）：另開一個沙箱，執行到研究室程式碼為止 ----------
// 這裡的判斷規則（部首字表、物態、原子計數、焰色）都在本腳本另寫一份，不引用 index.html 的實作
const labErrors = [];
const labStats = {};
(function(){
  const LAB_END = '/* ---------- Tab 切換時的資料刷新 ---------- */';
  const labEnd = html.indexOf(LAB_END, startIdx);
  if (labEnd === -1) { labErrors.push('找不到研究室程式碼的結尾標記'); return; }
  const box = { document: fakeDocument, localStorage: fakeLocalStorage, navigator: {}, console };
  vm.createContext(box);
  try {
    vm.runInContext(html.slice(startIdx, labEnd) + '\nvar __L={ELEMENTS,FULL_ELEMENTS,TEMP_DATA,TEMP_SPECIAL,DETECTIVE_CASES,BALANCE_PUZZLES,radicalGroup,tempState,parseFormulaAtoms,METAL_CATS,TEMP_PRESETS};', box, { filename: 'index.html(lab slice)' });
  } catch (err) { labErrors.push('執行研究室程式碼時發生例外：' + err.message); return; }
  const L = box.__L;
  const full = Object.fromEntries(L.FULL_ELEMENTS.map(e => [e.sym, e]));

  // 部首：獨立字表
  const GAS = '氫氦氮氧氟氖氯氬氪氙氡', WATER = '溴汞', STONE = '硼碳矽磷硫砷硒碲碘砈';
  let radicalChecked = 0;
  L.FULL_ELEMENTS.forEach(e => {
    if (e.zh === e.sym) { if (L.radicalGroup(e.zh) !== 'none') labErrors.push(`${e.sym} 沒有中文名卻被判成 ${L.radicalGroup(e.zh)}`); return; }
    radicalChecked++;
    const expect = GAS.includes(e.zh) ? 'gas' : WATER.includes(e.zh) ? 'water' : STONE.includes(e.zh) ? 'stone' : 'metal';
    if (L.radicalGroup(e.zh) !== expect) labErrors.push(`部首判斷錯誤：${e.zh}(${e.sym}) 應為 ${expect}，程式判成 ${L.radicalGroup(e.zh)}`);
    const isMetal = L.METAL_CATS.has(e.cat);
    if (isMetal && expect !== 'metal' && e.sym !== 'Hg') labErrors.push(`探究任務說「只有汞是沒有金字旁的金屬」，但 ${e.zh} 也是`);
    // 類金屬命名兩派並存：鍺銻釙用金字旁（App 內有探究任務說明），其餘非金屬不應有金字旁
    if (!isMetal && expect === 'metal' && !['Ge', 'Sb', 'Po'].includes(e.sym)) labErrors.push(`${e.zh}(${e.sym}) 有金字旁卻不是金屬分類，App 說明沒有涵蓋這個例外`);
  });
  labStats.radical = radicalChecked;

  // 物態：獨立判斷
  const C = (sym, t) => {
    if (sym === 'He') return t < -268.9 ? 'liquid' : 'gas';
    if (sym === 'C') return t < 3642 ? 'solid' : 'gas';
    if (sym === 'As') return t < 614 ? 'solid' : 'gas';
    const d = L.TEMP_DATA[sym]; if (!d) return 'unknown';
    return t < d[0] ? 'solid' : t < d[1] ? 'liquid' : 'gas';
  };
  Object.keys(L.TEMP_DATA).forEach(s => {
    const d = L.TEMP_DATA[s];
    if (!full[s]) labErrors.push(`TEMP_DATA 有不存在的元素 ${s}`);
    if (!(d[0] < d[1])) labErrors.push(`${s} 熔點 ${d[0]} 不低於沸點 ${d[1]}`);
  });
  let stateChecked = 0;
  [-273, -200, -89, 0, 25, 30, 37, 100, 1538, 3422, 5500].forEach(t => L.FULL_ELEMENTS.forEach(e => {
    stateChecked++;
    if (L.tempState(e.sym, t) !== C(e.sym, t)) labErrors.push(`${e.sym} 在 ${t}°C 的狀態：程式 ${L.tempState(e.sym, t)}，應為 ${C(e.sym, t)}`);
  }));
  labStats.state = stateChecked;
  const liquid25 = L.FULL_ELEMENTS.filter(e => C(e.sym, 25) === 'liquid').map(e => e.sym).sort().join(',');
  if (liquid25 !== 'Br,Hg') labErrors.push('25°C 的液態元素應只有 Br、Hg，實際：' + liquid25);
  const water = L.FULL_ELEMENTS.filter(e => L.radicalGroup(e.zh) === 'water').map(e => e.sym).sort().join(',');
  if (water !== liquid25) labErrors.push(`部首「水」的元素（${water}）與 25°C 液態元素（${liquid25}）不一致`);
  if (!(C('Ga', 25) === 'solid' && C('Ga', 37) === 'liquid')) labErrors.push('探究任務說鎵放在手心會融化，但資料不符');
  const metalsMelt = L.FULL_ELEMENTS.filter(e => L.METAL_CATS.has(e.cat) && L.TEMP_DATA[e.sym]).sort((a, b) => L.TEMP_DATA[b.sym][0] - L.TEMP_DATA[a.sym][0]);
  if (metalsMelt[0].sym !== 'W') labErrors.push('探究任務說熔點最高的金屬做燈絲（鎢），但資料最高的是 ' + metalsMelt[0].sym);
  const preset = Object.fromEntries(L.TEMP_PRESETS.map(([t, n]) => [n, t]));
  if (C('Fe', preset['鐵熔化']) !== 'liquid' || C('Fe', preset['鐵熔化'] - 1) !== 'solid') labErrors.push('「鐵熔化」預設溫度與鐵的熔點不符');
  if (C('W', preset['鎢熔化']) !== 'liquid' || C('W', preset['鎢熔化'] - 1) !== 'solid') labErrors.push('「鎢熔化」預設溫度與鎢的熔點不符');

  // 配平：獨立原子計數 + 窮舉 1~9 確認唯一最簡解
  const SUBD = s => s.replace(/[₀-₉]/g, c => String(c.charCodeAt(0) - 0x2080));
  function atoms(f) {
    let s = SUBD(f);
    while (/\(([^()]*)\)(\d*)/.test(s)) s = s.replace(/\(([^()]*)\)(\d*)/, (m, inner, n) => inner.replace(/([A-Z][a-z]?)(\d*)/g, (mm, el, k) => el + ((k ? +k : 1) * (n ? +n : 1))));
    const m = {}; s.replace(/([A-Z][a-z]?)(\d*)/g, (mm, el, k) => { m[el] = (m[el] || 0) + (k ? +k : 1); return mm; });
    return m;
  }
  const g2 = (a, b) => b ? g2(b, a % b) : a;
  L.BALANCE_PUZZLES.forEach(p => {
    const terms = p.lhs.concat(p.rhs);
    terms.forEach(f => { const a = atoms(f), b = L.parseFormulaAtoms(f); if (JSON.stringify(Object.entries(a).sort()) !== JSON.stringify(Object.entries(b).sort())) labErrors.push(`化學式 ${f} 原子計數不一致：程式 ${JSON.stringify(b)}，應為 ${JSON.stringify(a)}`); });
    const els = [...new Set(terms.flatMap(f => Object.keys(atoms(f))))];
    const balanced = co => els.every(el => p.lhs.reduce((s, f, i) => s + (atoms(f)[el] || 0) * co[i], 0) === p.rhs.reduce((s, f, j) => s + (atoms(f)[el] || 0) * co[p.lhs.length + j], 0));
    if (!balanced(p.ans)) labErrors.push(`配平題「${p.name}」的答案 ${p.ans} 不平衡`);
    if (p.ans.reduce(g2) !== 1) labErrors.push(`配平題「${p.name}」的答案 ${p.ans} 不是最簡整數比`);
    const sols = [];
    (function rec(i, co) { if (i === terms.length) { if (co.reduce(g2) === 1 && balanced(co)) sols.push(co.join(',')); return; } for (let c = 1; c <= 9; c++) rec(i + 1, co.concat(c)); })(0, []);
    if (sols.length !== 1 || sols[0] !== p.ans.join(',')) labErrors.push(`配平題「${p.name}」在 1~9 內的最簡解應只有 ${p.ans}，實際找到：${sols.join(' / ') || '無'}`);
  });
  labStats.balance = L.BALANCE_PUZZLES.length;
  const ids = L.BALANCE_PUZZLES.map(p => p.id);
  if (new Set(ids).size !== ids.length) labErrors.push('配平題 id 重複');

  // 偵探：結構 + 焰色與獨立焰色表一致
  const FLAME = { Li: '紅', Na: '黃色', K: '紫', Ca: '磚紅', Sr: '洋紅', Ba: '黃綠', Cu: '藍綠' };
  const cids = new Set();
  L.DETECTIVE_CASES.forEach(c => {
    if (cids.has(c.id)) labErrors.push('偵探案件 id 重複：' + c.id); cids.add(c.id);
    const syms = c.options.map(o => o.sym);
    if (!syms.includes(c.answer)) labErrors.push(`案件「${c.title}」的答案不在選項裡`);
    if (new Set(syms).size !== syms.length) labErrors.push(`案件「${c.title}」選項重複`);
    syms.forEach(s => { if (!full[s]) labErrors.push(`案件「${c.title}」的選項 ${s} 不是元素`); });
    if (c.tests.length < 2) labErrors.push(`案件「${c.title}」實驗少於 2 個`);
    c.tests.filter(t => t.name === '焰色反應').forEach(t => { if (!FLAME[c.answer] || !t.result.includes(FLAME[c.answer])) labErrors.push(`案件「${c.title}」焰色結果「${t.result}」與 ${c.answer} 的焰色（${FLAME[c.answer]}）不符`); });
  });
  labStats.cases = L.DETECTIVE_CASES.length;
})();
console.log(`\n=== 研究室（部首 ${labStats.radical || 0} 字、物態 ${labStats.state || 0} 格、配平 ${labStats.balance || 0} 題、偵探 ${labStats.cases || 0} 案） ===`);
if (!labStats.radical || !labStats.state || !labStats.balance || !labStats.cases) labErrors.push('研究室檢查有項目是 0 筆，沒有實際執行');
if (labErrors.length === 0) console.log('✅ 部首、物態、配平答案、偵探案件全部正確');
else labErrors.slice(0, 30).forEach(msg => console.log('❌ ' + msg));

const totalErrors = dataErrors.length + simErrors.length + eqErrors.length + labErrors.length;
console.log('\n' + (totalErrors === 0 ? '🎉 全部通過！' : `共發現 ${totalErrors} 個問題`));
process.exit(totalErrors === 0 ? 0 : 1);
