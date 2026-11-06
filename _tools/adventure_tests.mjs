/** End-to-end chapter progression, battle decisions, persistence, and offline assets. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const puppeteer=require('C:/Users/c0787/Desktop/App專案/02_其他App/700_學習計畫日曆/node_modules/puppeteer-core');
const ROOT=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const f=path.join(ROOT,decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));const data=await readFile(f);res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}`;
let browser,passed=0;
function check(ok,label){if(!ok)throw Error(label);passed++;console.log('PASS '+label);}
try{
 browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await page.setViewport({width:1280,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle0'});
 await page.click('[data-tab="adventure"]');
 const click=async id=>{await page.click(`[data-adv="${id}"]`);};
 const text=()=>page.$eval('#adventureRoot',n=>n.innerText);
 const answer=async(correct=true)=>{
   const idx=await page.evaluate(correct=>{
     const q=document.querySelector('.adv-question').textContent;
     let a;
     if(q.includes('符號是'))a=q.includes('「鐵」')?'Fe':q.includes('「釹」')?'Nd':'B';
     else if(q.includes('哪一個元素'))a=q.includes('Fe')?'鐵':q.includes('Nd')?'釹':'硼';
     else if(q.includes('分類')||q.includes('哪一類'))a=q.includes('Fe')?'過渡金屬':q.includes('Nd')?'鑭系':'類金屬';
     else if(q.includes('硼砂'))a='清潔劑與陶瓷上釉';
     else if(q.includes('生鏽'))a='水和氧氣';
     else if(q.includes('哪三種元素')||q.includes('哪一組元素'))a='Nd + Fe + B';
     else a='耳機喇叭';
     const opts=[...document.querySelectorAll('.adv-options button')];return opts.findIndex(b=>correct?b.textContent===a:b.textContent!==a);
   },correct);
   if(idx<0)throw Error('Could not identify answer');await click(`answer:${idx}`);
 };
 check(await page.$eval('[data-adv="patrol"]',e=>e.disabled),'new player cannot skip training');
 for(let i=0;i<3;i++){
   await click(`learn:${i}`);await click('lesson-start');await answer();await click('lesson-next');await click('lesson-start');await answer();await click('map');
 }
 check(await page.evaluate(()=>['Fe','Nd','B'].every(s=>state.inventory[s]&&state.mastery[s]===2)),'three companions recruited and mastery shared');
 await mkdir(path.join(ROOT,'_audit/adventure'),{recursive:true});
 await page.screenshot({path:path.join(ROOT,'_audit/adventure/desktop.png'),fullPage:true});
 await click('patrol');await click('action:observe');const before=await page.evaluate(()=>state.mastery.Fe);await answer();
 check(await page.evaluate(()=>state.mastery.Fe)===before,'observed answer does not increase mastery');await click('continue');
 await click('action:attack');await answer(false);await click('continue');
 await click('action:guard');await answer();
 check((await text()).includes('這回合沒有受到傷害'),'iron guard blocks a heavy attack');await click('continue');
 await click('action:guard');await answer();await click('continue');
 await click('action:attack');check((await text()).includes('逆轉機會'),'wrong answer returns after three turns');await answer();
 check((await text()).includes('逆轉成功'),'independent retry heals party');await click('continue');
 for(let n=0;n<8 && !(await text()).includes('齒輪小徑已打通');n++){await click('action:attack');await answer();await click('continue');}
 check(await page.evaluate(()=>state.adventure.patrol),'patrol completed');await click('map');
 await click('forge');await click('craft-magnet');check(await page.evaluate(()=>state.crafted['釹鐵硼磁鐵']),'chapter crafting shares recipe collection');
 await answer();check(await page.evaluate(()=>state.adventure.repaired),'application question repairs workshop');await click('map');
 await click('boss');await click('member:2');check(await page.$eval('[data-adv="action:synth"]',e=>e.disabled),'synthesis needs energy');
 await click('action:attack');await answer();await click('continue');
 await click('action:synth');await answer();await click('continue');
 check((await text()).includes('第二階段'),'boss moves into classification phase');
 await page.screenshot({path:path.join(ROOT,'_audit/adventure/battle.png'),fullPage:true});
 for(let n=0;n<12 && !(await text()).includes('工坊重新亮起');n++){await click('action:attack');await answer();await click('continue');}
 check(await page.evaluate(()=>state.adventure.boss),'all three boss phases completed');await click('map');
 const crystals=await page.evaluate(()=>state.crystals);
 await click('boss');
 for(let n=0;n<12 && !(await text()).includes('工坊重新亮起');n++){await click('action:attack');await answer();await click('continue');}
 check(await page.evaluate(()=>state.crystals)===crystals,'boss replay does not duplicate first-clear reward');await click('map');
 await click('expedition');for(let n=0;n<5;n++){await click('action:attack');await answer();await click('continue');}
 check(await page.evaluate(()=>state.adventure.expedition),'five-question expedition grants badge');await click('map');
 await page.reload({waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');
 check(await page.evaluate(()=>state.adventure.boss&&state.adventure.expedition&&state.crafted['釹鐵硼磁鐵']),'chapter and collection survive reload');
 await page.setViewport({width:390,height:844});await page.screenshot({path:path.join(ROOT,'_audit/adventure/mobile.png'),fullPage:true});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile map has no horizontal overflow');
 await click('boss');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile battle has no horizontal overflow');
 await page.screenshot({path:path.join(ROOT,'_audit/adventure/mobile-battle.png'),fullPage:true});
 await click('retreat');
 const beforeDefeat=await page.evaluate(()=>state.crystals);
 await click('patrol');
 for(let n=0;n<7 && !(await text()).includes('回營地整備');n++){await click('action:attack');await answer(false);await click('continue');}
 check((await text()).includes('回營地整備')&&await page.evaluate(()=>state.crystals)===beforeDefeat,'defeat returns to camp without granting rewards');
 await click('map');await click('boss');await click('action:guard');
 await page.click('[data-tab="overview"]');await page.click('[data-tab="adventure"]');
 check(!!await page.$('.adv-question'),'switching tabs preserves the active question');await click('retreat');
 const legacy=await page.evaluate(()=>{
   state.crystals=3;enterZone('nonmetal');startBattle('nonmetal','normal');
   const sym=battle.current.sym;state.mastery[sym]=0;useBattleHint();
   const hp=battle.enemyHp;answerBattle(battle.answer,document.querySelector('#battleOpts .opt'));
   return {sym,hp};
 });
 await page.waitForFunction(hp=>battle.enemyHp<hp,{},legacy.hp);
 check(await page.evaluate(sym=>state.mastery[sym]===0,legacy.sym),'legacy trial hint allows damage without granting mastery');
 await page.click('[data-tab="adventure"]');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await page.setOfflineMode(true);await page.reload({waitUntil:'networkidle0'});await page.click('[data-tab="adventure"]');
 check(await page.$eval('#adventureRoot',e=>e.innerText.includes('磁力工坊')),'adventure loads offline');
 check(await page.evaluate(()=>[...document.querySelectorAll('#adventureRoot img')].every(i=>i.complete&&i.naturalWidth>0)),'SVG assets load offline');
 check(errors.length===0,'no browser runtime errors: '+errors.join('; '));
 console.log(`Adventure: ${passed} checks passed`);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
