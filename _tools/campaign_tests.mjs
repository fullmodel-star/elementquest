/** Full nine-chapter UI campaign, old-save migration, rules, and offline asset coverage. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const puppeteer=require('C:/Users/c0787/Desktop/App專案/02_其他App/700_學習計畫日曆/node_modules/puppeteer-core');
const ROOT=path.resolve(import.meta.dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.join(ROOT,rel==='/'?'index.html':rel);const b=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
let browser,count=0;
const check=(ok,label)=>{if(!ok)throw Error(label);console.log('PASS '+label);count++;};
try{
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width:1280,height:960});await page.goto(url,{waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');
 const click=async id=>page.click(`[data-adv="${id}"]`);
 const text=()=>page.$eval('#adventureRoot',n=>n.innerText);
 const cp=i=>page.evaluate(i=>i===0?state.adventure:state.adventure.chapters[ADVENTURE_CONTENT.chapters[i].id],i);
 async function answer(){
   const idx=await page.evaluate(()=>{
     const text=document.querySelector('.adv-question').textContent.replace('✦ 逆轉機會：','');
     let answer;
     const sym=text.match(/^([A-Z][a-z]?) 是哪一個元素/);
     if(sym)answer=ELEMENTS.find(e=>e.sym===sym[1]).zh;
     const zh=text.match(/^「(.+)」的元素符號是/);
     if(zh)answer=ELEMENTS.find(e=>e.zh===zh[1]).sym;
     if(text.includes('分類標籤')||text.includes('哪一類'))answer=ELEMENTS.find(e=>text.includes(`${e.zh}（${e.sym}）`)).cat;
     for(const a of Object.values(ADVENTURE_CONTENT.applications))if(a[0]===text||a[1]===text)answer=a[2];
     for(const c of ADVENTURE_CONTENT.chapters)for(const q of c.mission)if(q.text===text)answer=q.answer;
     const opts=[...document.querySelectorAll('.adv-options button')];
     if(opts.filter(b=>b.textContent===answer).length!==1)throw Error('Question lacks unique expected answer: '+text);
     return opts.findIndex(b=>b.textContent===answer);
   });await click(`answer:${idx}`);
 }
 async function turn(action='attack',member=1){await click(`member:${member}`);await click(`action:${action}`);await answer();const t=await text();await click('continue');return t;}
 async function win(kind,i){
   await click(kind);let n=0;
   while(!(await page.$('.adv-result'))&&n++<40){
     const info=await page.$eval('.adv-intent',e=>e.textContent);
     const heavy=info.includes('蓄力重擊');
     const energy=Number(info.match(/能量 (\d)/)[1]);
     if(heavy||i===2&&n%3===1)await turn('guard',0);
     else if(energy&&i!==0&&kind==='boss')await turn('synth',2);
     else await turn('attack',1);
   }
   check(n<40&&!(await text()).includes('回營地整備'),`chapter ${i+1} ${kind} is winnable`);await click('map');
 }
 check(await page.$$eval('.adv-chapter',nodes=>nodes.length===9&&nodes.filter(n=>n.disabled).length===8),'nine chapters present; only chapter one unlocked');
 const coverage=await page.evaluate(()=>{
   const cs=ADVENTURE_CONTENT.chapters;
   return {zones:new Set(cs.map(c=>c.zone)).size,valid:cs.every(c=>c.team.length===3&&c.team.every(m=>ELEMENTS.some(e=>e.sym===m.sym)&&ADVENTURE_CONTENT.applications[m.sym])&&(!c.recipe||RECIPES.some(r=>r.product===c.recipe&&r.r.every(s=>c.team.some(m=>m.sym===s))))),unique:cs.every(c=>c.mission.every(q=>q.opts.length===4&&new Set(q.opts).size===4&&q.opts.filter(o=>o===q.answer).length===1)),assets:[...new Set(['crown',...cs.flatMap(c=>[c.item,c.enemy,c.scene,c.scout,...c.team.map(m=>m.art)])])]};
 });
 check(coverage.zones===9&&coverage.valid,'all nine kingdoms covered; every companion and recipe resolves');
 check(coverage.unique,'every mission has four unique options and one answer');
 await mkdir(path.join(ROOT,'_audit/adventure'),{recursive:true});
 for(let i=0;i<9;i++){
   if(i)await click(`chapter:${i}`);
   for(let m=0;m<3;m++){
     for(let step=0;step<2;step++){
       const needs=await page.evaluate(({i,m})=>{const s=ADVENTURE_CONTENT.chapters[i].team[m].sym;const c=state.adventure.certificates[s];return !c.symbol||!c.category;},{i,m});
       if(!needs)break;
       await click(`learn:${m}`);await click('lesson-start');await answer();await click('map');
     }
   }
   check(await page.$eval('[data-adv="patrol"]',b=>!b.disabled),`chapter ${i+1} recruitment unlocks patrol`);
   await win('patrol',i);await click('forge');
   const craft=await page.$('[data-adv="craft-magnet"]');if(craft){check(await craft.evaluate(b=>!b.disabled),`chapter ${i+1} recipe materials ready`);await click('craft-magnet');}
   let steps=0;
   while(!(await cp(i)).repaired&&steps++<5){
     await answer();
     if(!(await cp(i)).repaired){
       if(i===1&&steps===1){await page.reload({waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');await click('forge');check((await text()).includes('判讀 2/2'),'partial mission resumes after reload');}
       else await click('mission-next');
     }
   }
   check((await cp(i)).repaired,`chapter ${i+1} evidence mission completes`);await click('map');
   // Exercise each distinctive battle rule through actual choices, then retreat.
   if(i>0&&i<8){
     await click('boss');let observed;
     if(i===1){observed=await turn('guard',0);check(observed.includes('防護蓄能 +1'),'rush rule grants guard energy');}
     if(i===2){observed=await turn('attack',1);check(observed.includes('岩甲減少 8'),'armor reduces damage');observed=await turn('guard',0);check(observed.includes('岩甲已擊碎'),'guard breaks armor');}
     if(i===3){await turn();observed=await turn();check(observed.includes('普通攻擊減半'),'mirror reduces even-turn normal attack');}
     if(i===4){await turn();observed=await turn('guard',0);check(observed.includes('回復 6 生命'),'rest rule heals after damage');}
     if(i===5){await turn();observed=await turn();check(observed.includes('知識連擊 +10'),'flow rewards independent consecutive answers');}
     if(i===6){await turn('guard',0);observed=await turn();check(observed.includes('防護蓄勢 +10'),'charge rule buffs next attack');}
     if(i===7){check((await text()).includes('能量 1/3'),'resonance starts with energy');observed=await turn('synth',2);check(observed.includes('造成 40 傷害'),'resonance skill deals 40 damage');}
     await click('retreat');
   }
   await win('boss',i);
   if(i<8)check(await page.$eval(`[data-adv="chapter:${i+1}"]`,b=>!b.disabled),`chapter ${i+2} unlocks after previous boss`);
   if(i===8)await page.screenshot({path:path.join(ROOT,'_audit/adventure/campaign-ending.png'),fullPage:true});
   await click('expedition');for(let n=0;n<5;n++)await turn('attack',1);
   check((await cp(i)).expedition,`chapter ${i+1} expedition badge recorded`);await click('map');
 }
 check((await text()).includes('九國全遠征認證達成'),'all nine chapters and nine badges produce the ending');
 check(await page.evaluate(()=>state.crystals===81),'exactly nine first-clear reward sets (81 crystals)');
 const before=await page.evaluate(()=>JSON.stringify(state.adventure));
 await page.reload({waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');
 check(await page.evaluate(()=>JSON.stringify(state.adventure))===before,'entire campaign and selected chapter survive reload');
 await page.setViewport({width:390,height:844});await page.screenshot({path:path.join(ROOT,'_audit/adventure/campaign-mobile.png'),fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile campaign has no page overflow');
 await click('boss');await page.screenshot({path:path.join(ROOT,'_audit/adventure/final-boss-mobile.png'),fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile final boss has no page overflow');await click('retreat');
 // Repeat the last boss and ensure no duplicate reward.
 await win('boss',8);check(await page.evaluate(()=>state.crystals===81),'replaying final boss cannot duplicate rewards');
 // Hints cannot complete a boss phase or earn the independent expedition badge.
 await click('chapter:0');await click('boss');for(let n=0;n<4;n++)await turn('observe',0);
 check((await text()).includes('敵方生命 81/120')&&(await text()).includes('本階段獨立認證：尚未達成'),'observation cannot bypass boss phase certification');await click('retreat');
 // Load an actual first-release-shaped save into a separate browser context.
 const ctx=await browser.createBrowserContext();const old=await ctx.newPage();await old.goto(url,{waitUntil:'networkidle0'});
 await old.evaluate(()=>{localStorage.setItem('elementquest_save_v2',JSON.stringify({crystals:9,mastery:{Fe:4,Nd:4,B:4},known:{Fe:true,Nd:true,B:true},inventory:{Fe:true,Nd:true,B:true},crafted:{'釹鐵硼磁鐵':true},adventure:{patrol:true,repaired:true,boss:true,expedition:true,certificates:{Fe:{symbol:true,category:true},Nd:{symbol:true,category:true},B:{symbol:true,category:true}}}}));});
 await old.reload({waitUntil:'networkidle0'});await old.click('[data-tab="adventure"]');
 check(await old.evaluate(()=>state.crystals===9&&state.adventure.boss&&state.adventure.expedition&&!state.adventure.chapters.flame.boss),'original chapter-one save retains flags and crystals');
 check(await old.$eval('[data-adv="chapter:1"]',b=>!b.disabled),'old completed chapter unlocks chapter two automatically');await ctx.close();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.setOfflineMode(true);await page.reload({waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');
 const loaded=await page.evaluate(async names=>Promise.all(names.map(n=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=`assets/adventure/${n}.svg`;}))),coverage.assets);
 check(loaded.length>50&&loaded.every(Boolean),`all ${loaded.length} referenced campaign SVGs load offline`);
 await click('chapter:8');check((await text()).includes('九國全遠征認證達成'),'final chapter remains playable offline');
 check(errors.length===0,'no browser errors: '+errors.join('; '));console.log(`Campaign: ${count} checks passed`);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
