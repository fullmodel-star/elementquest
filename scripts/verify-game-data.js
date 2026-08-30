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
check(RECIPES.length === 46, 'RECIPES 數量應為 46，實際 ' + RECIPES.length);

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

const totalErrors = dataErrors.length + simErrors.length;
console.log('\n' + (totalErrors === 0 ? '🎉 全部通過！' : `共發現 ${totalErrors} 個問題`));
process.exit(totalErrors === 0 ? 0 : 1);
