/* Nine-chapter campaign; shared knowledge, per-chapter quests, backwards-compatible saves. */
(() => {
  'use strict';
  const root=document.getElementById('adventureRoot');
  const {chapters,applications}=ADVENTURE_CONTENT;
  const art=name=>`assets/adventure/${name}.svg`;
  const el=sym=>ELEMENTS.find(e=>e.sym===sym);
  const image=(name,alt='')=>`<img src="${art(name)}" alt="${alt}" width="160" height="160">`;
  const button=(id,label,disabled=false,cls='')=>`<button type="button" class="adv-btn ${cls}" data-adv="${id}" ${disabled?'disabled':''}>${label}</button>`;
  const shuffle=items=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function campaign(){
    if(!isPlainObject(state.adventure))state.adventure={};
    const a=state.adventure;
    if(!isPlainObject(a.certificates))a.certificates={};
    if(!isPlainObject(a.chapters))a.chapters={};
    chapters.forEach(c=>{
      c.team.forEach(m=>{if(!isPlainObject(a.certificates[m.sym]))a.certificates[m.sym]={};});
      if(c.number>1&&!isPlainObject(a.chapters[c.id]))a.chapters[c.id]={};
    });
    return a;
  }
  // First chapter flags remain at their original location; no reset or duplicate reward migration.
  const chapterProgress=c=>c.number===1?campaign():campaign().chapters[c.id];
  const unlocked=i=>i===0||chapters.slice(0,i).every(c=>chapterProgress(c).boss===true);
  let selected=chapters.findIndex(c=>c.id===campaign().selectedChapter);
  if(selected<0||!unlocked(selected))selected=0;
  let run=null,lesson=null,result=null,mission=null;
  const chapter=()=>chapters[selected];
  const progress=()=>chapterProgress(chapter());
  const members=()=>chapter().team;
  const recipe=()=>RECIPES.find(r=>r.product===chapter().recipe);
  const cert=sym=>campaign().certificates[sym];
  const recruited=sym=>cert(sym).symbol===true;
  const trained=()=>members().every(m=>['symbol','category'].every(t=>cert(m.sym)[t]===true));
  const save=()=>{saveState();updateHeaderStats();};
  function question(sym,type,reverse=false){
    const e=el(sym);
    if(type==='symbol'){
      const other=shuffle(ELEMENTS.filter(x=>x.sym!==sym)).slice(0,3);
      return {sym,type,text:reverse?`「${e.zh}」的元素符號是？`:`${sym} 是哪一個元素？`,answer:reverse?sym:e.zh,opts:shuffle([reverse?sym:e.zh,...other.map(x=>reverse?x.sym:x.zh)]),explain:`${e.zh}的元素符號是 ${sym}。`};
    }
    if(type==='category'){
      const q=makeCategoryQuestion([e]);
      return {sym,type,text:reverse?`請為${e.zh}（${sym}）選擇正確的分類標籤。`:`${e.zh}（${sym}）在遊戲週期表中屬於哪一類？`,answer:q.answer,opts:shuffle(q.opts),explain:q.explain};
    }
    const a=applications[sym];
    return {sym,type,text:a[reverse?1:0],answer:a[2],opts:shuffle(a.slice(2)),explain:e.fact};
  }
  function certify(q){
    cert(q.sym)[q.type]=true;state.known[q.sym]=true;state.inventory[q.sym]=true;
    state.mastery[q.sym]=Math.min(MASTERY_MAX,(state.mastery[q.sym]||0)+1);save();
  }
  function resetScreen(){run=null;lesson=null;result=null;mission=null;}
  function selectChapter(i){if(!Number.isInteger(i)||!chapters[i]||!unlocked(i)||run)return;resetScreen();selected=i;campaign().selectedChapter=chapter().id;save();render();}
  function party(selectable=false){return `<div class="adv-party">${members().map((m,i)=>`<button type="button" class="adv-member ${run&&run.member===i?'selected':''}" data-adv="${selectable?'member:':'learn:'}${i}" ${selectable&&(!recruited(m.sym)||run.q||run.feedback)?'disabled':''} ${selectable?`aria-pressed="${run.member===i}"`:''}>${image(m.art,m.name)}<b>${m.name}</b><small>${m.sym} · ${m.role}</small><small>${recruited(m.sym)?`熟練度 ${state.mastery[m.sym]||0}/5`:'點擊認識夥伴'}</small></button>`).join('')}</div>`;}
  function chapterMap(){
    const done=chapters.filter(c=>chapterProgress(c).boss===true).length;
    const badges=chapters.filter(c=>chapterProgress(c).expedition===true).length;
    return `<div class="adv-campaign"><div class="adv-toolbar"><div><span class="adv-kicker">THE NINE KINGDOMS</span><h2>九國遠征・${done}/9 章通關</h2></div><span class="adv-chip">遠征徽章 ${badges}/9</span></div><div class="adv-chapters">${chapters.map((c,i)=>`<button type="button" class="adv-chapter ${selected===i?'selected':''} ${chapterProgress(c).boss?'done':''}" data-adv="chapter:${i}" aria-pressed="${selected===i}" ${unlocked(i)?'':`disabled title="先完成第 ${i} 章關主"`}>${image(c.item)}<span><small>CHAPTER ${String(i+1).padStart(2,'0')} ${chapterProgress(c).boss?'✓':''}</small><b>${c.title}</b><small>${unlocked(i)?chapterProgress(c).expedition?'徽章已收集':'可前往':`先完成第 ${i} 章關主`}</small></span></button>`).join('')}</div>${done===9?`<div class="adv-ending">${image('crown','九國星冠')}<div><h3>九國星圖完整點亮</h3><p>你完成了九章的關主與知識任務。各章遠征仍可重玩，集齊九枚徽章，完成全遠征認證。</p>${badges===9?'<b class="adv-success">✦ 九國全遠征認證達成</b>':''}</div></div>`:''}</div>`;
  }
  function node(id,n,title,desc,enabled,done,current,icon){return `<button type="button" class="adv-node ${done?'done':''} ${current?'current':''}" data-adv="${id}" ${enabled?'':'disabled'}>${image(icon)}<span><b>${done?'✓':n}　${title}</b><small>${desc}</small></span></button>`;}
  function render(){
    const c=chapter(),p=progress();root.style.setProperty('--adv-mint',c.color);
    if(run){renderBattle();return;}if(lesson){renderLesson();return;}if(mission){renderMission();return;}
    if(result){root.innerHTML=`<div class="adv-card adv-result">${image(result.win?c.item:'hero',result.win?'完成挑戰':'勇者休息')}<h2>${result.title}</h2><p>${result.text}</p>${button('map','回到冒險地圖',false,'primary')}${result.win&&p.boss&&selected<8?button(`chapter:${selected+1}`,'前往下一章'):''}</div>`;return;}
    root.innerHTML=`${chapterMap()}<div class="adv-banner ${p.boss?'restored':''}" style="background-image:url('${art(c.scene)}')"><div class="adv-kicker">CHAPTER ${String(c.number).padStart(2,'0')} / ${ZONES.find(z=>z.key===c.zone).name}</div><h2>${p.boss?c.ending:c.subtitle}</h2><p>${p.boss?(selected===8?'九章主線已完成。回訪各章，挑戰五題遠征，集齊九枚專屬徽章。':'本章的任務已完成。可以繼續下一章，或挑戰五題遠征取得專屬徽章。'):c.story}</p><span class="adv-chip">每章約 10–15 分鐘</span><span class="adv-chip">章節進度自動儲存</span></div>
    <div class="adv-layout"><div class="adv-card"><h3>第 ${c.number} 章・${c.title}</h3><div class="adv-route">
    ${node('learn:0','01','旅人營地','認識三位夥伴，完成辨識與分類認證',true,trained(),!trained(),'hero')}
    ${node('patrol','02',c.patrol,'預判敵方攻擊，練習本章戰鬥規則',trained(),p.patrol,trained()&&!p.patrol,c.scout)}
    ${node('forge','03',c.title,c.task,!!p.patrol,p.repaired,p.patrol&&!p.repaired,c.item)}
    ${node('boss','04',c.boss,'辨識 → 分類 → 應用，每階段至少一次獨立答對',!!p.repaired,p.boss,p.repaired&&!p.boss,c.enemy)}
    ${node('expedition','05',selected===0?'山谷遠征':'王國遠征',`五題至少獨立答對四題，取得「${c.badge}」徽章`,!!p.boss,p.expedition,false,'compass')}
    </div><p class="adv-rule">${c.ruleText}</p>${p.boss&&selected<8?button(`chapter:${selected+1}`,'前往下一章',false,'primary'):''}</div><aside class="adv-card"><h3>你的元素小隊</h3>${party()}<p class="adv-muted">點擊夥伴可學習或補強熟練度。三位夥伴共享生命，每回合選一位行動。重複登場的元素保留認證與熟練度。</p><div class="adv-npc">${image('mentor','工坊導師')}<p>「先理解元素，再讓知識成為冒險的力量。」</p></div><p class="adv-muted">戰鬥技能是幻想設定，並非化學相剋。任務沿用元素圖鑑與配方資料。戰鬥切換分頁可繼續；重新整理會返回地圖，已取得的學習與任務進度保留。</p>${p.expedition?`<span class="adv-chip">✦ ${c.badge}認證</span>`:''}</aside></div>`;
  }
  function learn(i){
    if(!members()[i])return;
    const m=members()[i],a=cert(m.sym),type=!a.symbol?'symbol':!a.category?'category':(state.mastery[m.sym]||0)<TRIPLE_MASTERY?'symbol':'application';
    lesson={i,q:question(m.sym,type,Math.random()<.5),asked:false,feedback:null};render();
  }
  const options=(q,feedback)=>`<div class="adv-options">${q.opts.map((o,i)=>button(`answer:${i}`,o,!!feedback)).join('')}</div>`;
  function renderLesson(){
    const m=members()[lesson.i],e=el(m.sym),a=cert(m.sym);
    root.innerHTML=`<div class="adv-card"><div class="adv-toolbar"><h3>旅人營地・${m.name}</h3>${button('map','返回地圖')}</div><div class="adv-npc">${image(m.art,m.name)}<div><h2>${e.zh} ${e.sym}</h2><span class="adv-chip">${e.cat}</span><p>${e.fact}</p><p class="adv-success">${m.perk}（幻想戰鬥技能）</p></div></div><p class="adv-muted">認證：${a.symbol?'✓':'○'} 辨識　${a.category?'✓':'○'} 分類　${a.application?'✓':'○'} 應用</p><p>閱讀介紹，準備好後收起資料，試著自己回答。</p>${button('lesson-start','收起資料，開始挑戰',false,'primary')}</div>`;
    if(lesson.asked)root.innerHTML=`<div class="adv-card"><div class="adv-toolbar"><h3>${m.name}・知識認證</h3>${button('map','返回地圖')}</div><p class="adv-question">${lesson.q.text}</p>${options(lesson.q,lesson.feedback)}${lesson.feedback?`<div class="adv-feedback ${lesson.feedback.correct?'':'wrong'}" role="status">${lesson.feedback.text}</div>${button('lesson-next',lesson.feedback.correct?'繼續學習':'換個問法再試一次',false,'primary')}${button(`learn:${(lesson.i+1)%3}`,'認識下一位夥伴')}`:''}</div>`;
  }
  function start(kind){
    const p=progress();if((kind==='patrol'&&!trained())||(kind==='boss'&&!p.repaired)||(kind==='expedition'&&!p.boss))return;
    result=null;run={kind,hp:100,enemy:kind==='boss'?120:60,max:kind==='boss'?120:60,energy:chapter().rule==='resonance'&&kind==='boss'?1:0,turn:1,member:0,q:null,feedback:null,action:null,pending:[],rewarded:[],correct:0,independent:0,questions:0,proof:[false,false,false],streak:0,exposedUntil:0,charged:false,finalPool:shuffle(Array.from(new Set(chapters.flatMap(c=>c.team.map(m=>m.sym)))))};render();
  }
  const phase=()=>run.kind==='boss'?Math.min(2,Math.floor((run.max-run.enemy)/40)):0;
  function intent(){const rule=chapter().rule;return run.turn%(rule==='rush'?2:3)===0?(rule==='charge'&&run.kind==='boss'?34:28):14;}
  function selectAction(action){
    if(!run||run.q||run.feedback)return;
    const m=members()[run.member],cost=m.skill==='synth'?1:2;
    if(action==='synth'&&(!progress().repaired||run.energy<cost))return;
    if(action==='synth')run.energy-=cost;
    const ri=run.pending.findIndex(x=>x.due<=run.turn),retry=ri>=0?run.pending.splice(ri,1)[0]:null;
    const type=retry?retry.type:run.kind==='boss'?['symbol','category','application'][phase()]:run.kind==='expedition'?['symbol','category','application'][run.questions%3]:action==='guard'?'category':action==='synth'?'application':'symbol';
    const all=run.finalPool;
    const sym=retry?retry.sym:chapter().rule==='final'&&run.kind==='boss'?all[run.questions%all.length]:run.kind==='expedition'?members()[run.questions%3].sym:m.sym;
    run.q=question(sym,type,!!retry||run.turn%2===0);run.q.retry=!!retry;run.action=action;render();
  }
  function renderBattle(){
    const c=chapter(),m=members()[run.member],boss=run.kind==='boss',exp=run.kind==='expedition',p=phase(),cost=m.skill==='synth'?1:2;
    root.innerHTML=`<div class="adv-toolbar"><h2>${exp?(selected===0?'山谷遠征':'王國遠征'):boss?c.boss:c.patrol}</h2>${button('retreat','撤回營地')}</div><div class="adv-layout"><div class="adv-card"><div class="adv-arena"><div>${image(m.art,m.name)}<b>${m.name}</b><p>隊伍生命 ${run.hp}/100</p><progress class="adv-hp" max="100" value="${run.hp}" aria-label="隊伍生命"></progress></div><div>${image(boss?c.enemy:c.scout,boss?c.boss:'巡邏守衛')}<b>${boss?['第一階段・看穿偽裝','第二階段・破解護盾','第三階段・修復核心'][p]:exp?`複習 ${Math.min(5,run.questions+1)}/5`:c.patrol}</b><p>${exp?`獨立答對 ${run.independent} 題`:`敵方生命 ${run.enemy}/${run.max}`}</p>${exp?'':`<progress class="adv-hp" max="${run.max}" value="${run.enemy}" aria-label="敵方生命"></progress>`}</div></div><div class="adv-intent">第 ${run.turn} 回合 · 敵方意圖：${intent()>=28?'蓄力重擊':'普通攻擊'}（${intent()} 傷害） · 能量 ${run.energy}/3</div><p class="adv-rule">${c.ruleText}${boss?` 本階段獨立認證：${run.proof[p]?'已達成':'尚未達成'}。`:''}</p>
    ${run.q?`<p class="adv-question">${run.q.retry?'✦ 逆轉機會：':''}${run.q.text}</p>${run.action==='observe'?`<div class="adv-feedback">觀察線索：${run.q.explain}<br>本題協助完成，不增加熟練度、關主認證或遠征獨立答對數。</div>`:''}${options(run.q,run.feedback)}`:`<p class="adv-muted">先從小隊選擇夥伴，再選行動。每回合敵人都會還擊，防護可以抵擋傷害。</p><div class="adv-actions">${button('action:attack',`普通攻擊<small>${m.skill==='strike'?25:20} 傷害 · 答對獲得 1 能量</small>`)}${button('action:guard',`防護反擊<small>10 傷害 · ${m.skill==='guard'?'完全擋下攻擊':'擋下 20 傷害'}</small>`)}${button('action:observe','觀察<small>顯示線索 · 10 傷害，不增熟練度</small>')}${button('action:synth',`${selected===0?'合成技':'共鳴技'}<small>${c.rule==='resonance'&&boss?40:30} 傷害 · 消耗 ${cost} 能量${progress().repaired?'':' · 完成本章任務後解鎖'}</small>`,!progress().repaired||run.energy<cost)}</div>`}
    ${run.feedback?`<div class="adv-feedback ${run.feedback.correct?'':'wrong'}" role="status">${run.feedback.text}</div>${button('continue',run.feedback.ended?'查看結果':'準備下一回合',false,'primary')}`:''}</div><aside class="adv-card"><h3>選擇行動夥伴</h3>${party(true)}<p>${m.perk}</p><p class="adv-muted">觀察不扣結晶；答錯不降低已學熟練度。逆轉題獨立答對回復 12 生命，每項知識每場限一次。戰鬥技能不是現實化學反應。</p>${run.pending.length?'<span class="adv-chip">錯題已加入後續逆轉挑戰</span>':''}<p class="adv-muted">撤退與重整會回營地；已取得的學習成果保留。切換遊戲分頁可繼續本場戰鬥。</p></aside></div>`;
  }
  function answer(index){
    if(lesson){if(!lesson.asked||lesson.feedback)return;const q=lesson.q,correct=q.opts[index]===q.answer;if(correct)certify(q);lesson.feedback={correct,text:`${correct?'認證成功！熟練度提升。':'沒關係，先看看解析。'} ${q.explain}`};render();return;}
    if(mission){answerMission(index);return;}
    if(!run||!run.q||run.feedback)return;
    const q=run.q,correct=q.opts[index]===q.answer,m=members()[run.member],assisted=run.action==='observe',c=chapter(),boss=run.kind==='boss',currentPhase=phase();
    let damage=0,blocked=0,heal=0,bonus='';
    if(correct){
      if(!assisted){certify(q);run.independent++;if(q.type===['symbol','category','application'][currentPhase])run.proof[currentPhase]=true;}
      run.correct++;run.streak=assisted?0:run.streak+1;
      damage=run.action==='synth'?(c.rule==='resonance'&&boss?40:30):run.action==='attack'?20+(m.skill==='strike'?5:0):10;
      if(run.action==='attack')run.energy=Math.min(3,run.energy+1);
      if(run.action==='guard'){
        blocked=m.skill==='guard'?intent():20;
        if(c.rule==='rush'){run.energy=Math.min(3,run.energy+1);bonus+='防護蓄能 +1。';}
        if(c.rule==='rest'){const n=Math.min(6,100-run.hp);run.hp+=n;heal+=n;bonus+='休整回復生命。';}
        if(c.rule==='armor'&&boss){run.exposedUntil=run.turn+2;bonus+='岩甲已擊碎兩回合。';}
      }
      if(c.rule==='armor'&&boss&&run.turn>run.exposedUntil){damage=Math.max(1,damage-8);bonus+='岩甲減少 8 傷害。';}
      if(c.rule==='mirror'&&boss&&run.turn%2===0&&run.action==='attack'){damage=Math.floor(damage/2);bonus+='稜鏡使普通攻擊減半。';}
      if(c.rule==='flow'&&run.streak>0&&run.streak%2===0){damage+=10;bonus+='知識連擊 +10 傷害。';}
      if(c.rule==='charge'&&run.charged&&run.action==='attack'){damage+=10;run.charged=false;bonus+='防護蓄勢 +10 傷害。';}
      if(c.rule==='charge'&&run.action==='guard')run.charged=true;
      const key=q.sym+q.type;
      if(q.retry&&!assisted&&!run.rewarded.includes(key)){const n=Math.min(12,100-run.hp);heal+=n;run.hp+=n;run.rewarded.push(key);bonus+='逆轉成功。';}
      if(run.kind!=='expedition'){
        const floor=boss?Math.max(0,80-currentPhase*40)+(run.proof[currentPhase]?0:1):0;
        const old=run.enemy;run.enemy=Math.max(floor,run.enemy-damage);damage=old-run.enemy;
        if(boss&&!run.proof[currentPhase]&&run.enemy===floor)bonus+='需要本階段獨立答對，才能解除最後一道封印。';
      }
    }else{run.streak=0;bumpErrorType(q.sym,q.type==='application'?'equation':q.type);save();}
    if(!correct||(q.retry&&assisted))if(!run.pending.some(x=>x.sym===q.sym&&x.type===q.type))run.pending.push({sym:q.sym,type:q.type,due:run.turn+3});
    run.questions++;
    const won=run.kind==='expedition'?run.questions>=5&&run.independent>=4:run.enemy<=0;
    const hit=won?0:Math.max(0,intent()-blocked);run.hp=Math.max(0,run.hp-hit);
    const ended=won||run.hp===0||(run.kind==='expedition'&&run.questions>=5);
    run.feedback={correct,ended,won,text:`${correct?'答對了！':'這次沒有成功。'} ${q.explain} ${correct?(run.kind==='expedition'?(assisted?'本題協助完成。':'本題獨立完成。'):`造成 ${damage} 傷害。${assisted?'本題為協助完成。':''}`):'錯題會在三回合後換個問法再出現。'} ${hit?`隊伍受到 ${hit} 傷害。`:'這回合沒有受到傷害。'} ${heal?`回復 ${heal} 生命。`:''} ${bonus}`};render();
  }
  function finish(){
    const p=progress(),win=run.feedback.won,kind=run.kind,c=chapter();let reward=0;
    if(win){const flag=kind==='patrol'?'patrol':kind==='boss'?'boss':'expedition';if(p[flag]!==true){p[flag]=true;reward=kind==='boss'?5:2;state.crystals+=reward;}save();}
    result={win,title:win?(kind==='boss'?(selected===0?'工坊重新亮起！':c.ending):kind==='expedition'?`${c.badge}認證！`:`${c.patrol}已打通！`):'回營地整備，再出發',text:win?`${reward?`首次完成，獲得 ${reward} 顆結晶。`:'複習完成，學習成果已保留。'} ${kind==='boss'?(selected===8?'九章主線全部完成！回地圖查看九國星冠。':`本章遠征與第 ${c.number+1} 章已開放。`):kind==='patrol'?`前往${c.title}，完成「${c.task}」。`:'徽章已記入九國星圖。'}`:`${kind==='expedition'?'遠征需五題至少獨立答對四題。':''}熟練度與認證保留；可以先回營地閱讀介紹，再來挑戰。`};run=null;render();
  }
  function missionIndex(){return progress().repaired?chapter().mission.length:Math.min(chapter().mission.length-1,toNonNegInt(progress().missionStep));}
  function openMission(){if(!progress().patrol)return;const n=missionIndex();mission={step:n,q:n<chapter().mission.length?{...chapter().mission[n],opts:shuffle(chapter().mission[n].opts)}:null,feedback:null,correct:false};render();}
  function renderMission(){
    const c=chapter(),r=recipe(),crafted=r?!!state.crafted[r.product]:true;
    const short=r?tripleShortfall(r):[],missing=r?r.r.filter(s=>!state.inventory[s]):[];
    const ready=r?recipeReady(r)&&missing.length===0:true;
    const explanation=r?(r.type==='alloy'?'這是遊戲中的製造抽象。合金配比與製程有差異，不代表把材料放在一起就會自動形成。':'這是虛擬配方學習，元素卡片代表組成，不是可自行照做的實驗步驟。'):'本章以圖鑑與觀察記錄判讀完成，不需要合成物或實體操作。';
    root.innerHTML=`<div class="adv-card"><div class="adv-toolbar"><h2>${c.title}</h2>${button('map','返回地圖')}</div><div class="adv-forge">${image(c.item,c.task)}<div><h3>${c.task}</h3><p>${c.story}</p>${r?`<p class="adv-muted">配方：${r.name} · ${r.r.join(' + ')}${r.r.length===3?' · 材料熟練度各達 2/5':''}</p>`:'<p class="adv-muted">依序回答觀察判斷與證據，完成研究委託。</p>'}</div></div>${members().map((m,i)=>button(`learn:${i}`,`${el(m.sym).zh} ${m.sym} · 熟練度 ${state.mastery[m.sym]||0}/5`)).join(' ')}
    ${!crafted?`<p>${short.length?'還需要補強：'+short.map(s=>el(s).zh).join('、'):missing.length?'還需要認識材料：'+missing.join('、'):'材料已準備好。'}</p>${button('craft-magnet',selected===0?'製作磁鐵':'完成虛擬配方',!ready,'primary')}`:progress().repaired?`<div class="adv-feedback" role="status">✓ 本章委託已完成，${c.boss}的道路已開放。${mission.feedback?`<p>${mission.feedback}</p>`:""}</div>${button('map','前往核心試煉',false,'primary')}`:`<p class="adv-success">${r?'✓ 產物已收錄合成圖鑑':'研究記錄已開啟'} · 判讀 ${mission.step+1}/${c.mission.length}</p><p class="adv-question">${mission.q.text}</p>${options(mission.q,mission.feedback)}${mission.feedback?`<div class="adv-feedback ${mission.correct?'':'wrong'}" role="status">${mission.feedback}</div>${button('mission-next',mission.correct?'繼續下一份記錄':'換個順序重新判斷',false,'primary')}`:''}`}
    <p class="adv-muted">${explanation}</p></div>`;
  }
  function answerMission(index){
    const r=recipe();if((r&&!state.crafted[r.product])||mission.feedback||!mission.q||progress().repaired)return;
    const correct=mission.q.opts[index]===mission.q.answer;mission.correct=correct;
    if(correct){progress().missionStep=mission.step+1;if(progress().missionStep>=chapter().mission.length)progress().repaired=true;certify(mission.q);}
    mission.feedback=(correct?'證據判斷正確。':'先閱讀解析再試一次。')+mission.q.explain;render();
  }
  root.addEventListener('click',event=>{
    const b=event.target.closest('[data-adv]');if(!b||b.disabled)return;const [cmd,arg]=b.dataset.adv.split(':');
    if(cmd==='chapter')selectChapter(Number(arg));
    else if(cmd==='map'||cmd==='retreat'){resetScreen();render();}
    else if(cmd==='learn'){if(run)return;mission=null;result=null;learn(Number(arg));}
    else if(cmd==='lesson-start'&&lesson){lesson.asked=true;render();}
    else if(cmd==='lesson-next'&&lesson&&lesson.feedback){if(lesson.feedback.correct)learn(lesson.i);else{lesson.q=question(members()[lesson.i].sym,lesson.q.type,true);lesson.feedback=null;render();}}
    else if(cmd==='member'&&run&&!run.q&&!run.feedback&&members()[Number(arg)]){run.member=Number(arg);render();}
    else if(cmd==='action')selectAction(arg);
    else if(cmd==='answer')answer(Number(arg));
    else if(cmd==='continue'&&run&&run.feedback){if(run.feedback.ended)finish();else{run.turn++;run.q=null;run.feedback=null;render();}}
    else if(['patrol','boss','expedition'].includes(cmd))start(cmd);
    else if(cmd==='forge'||cmd==='mission-next')openMission();
    else if(cmd==='craft-magnet'){
      const r=recipe();if(!progress().patrol||!r||!recipeReady(r)||r.r.some(s=>!state.inventory[s])||state.crafted[r.product])return;
      state.crafted[r.product]=true;save();render();
    }
    const focus=root.querySelector('.adv-question,h2,h3');if(focus){focus.tabIndex=-1;focus.focus({preventScroll:true});}
  });
  const previousSwitch=switchTab;switchTab=function(name){previousSwitch(name);if(name==='adventure')render();};render();
})();
