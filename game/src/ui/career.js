/* South Paw · src/ui/career.js
   Career: three tournaments, Amateur and Pro (16 fighters) and Ultimate (32). Win one to open the next.
   The fighters, their styles and looks are in data/career.js (made by tools/career/make_roster.py).
   - Bracket: you start against the weakest man in the field; each later round's opponent comes out of a bigger,
     stronger part of the draw, so every round is harder than the last and the final is against the best left standing.
   - Your fights are real fights against the CPU; every other bout is decided by the two men's skill and a seeded dice roll.
   - Each fighter becomes a CPU profile: his skill sets the CPU's numbers (from below Easy to past Hard), his style
     changes how he fights (src/ai/cpu.js), his signature punch gets extra weight, and tough/power change the damage
     he takes and deals (src/sim/combat.js). In the Ultimate they also get tougher every round.
   - Progress is saved on this device (localStorage sp.career). A result counts as soon as the match ends.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const CAR_FIGHTER=Object.fromEntries(CAREER.fighters.map(f=>[f.id,f]));
const CAR_TOUR=Object.fromEntries(CAREER.tours.map(t=>[t.id,t]));
const CAR_ORDER=['amateur','pro','ultimate'];
const CAR_ROUND={32:'Round of 32',16:'Round of 16',8:'Quarter-final',4:'Semi-final',2:'Final'};
function carLoad(){try{const c=JSON.parse(localStorage.getItem('sp.career')||'null');if(c&&typeof c==='object')return Object.assign({champ:{},runs:{}},c);}catch(e){}return {champ:{},runs:{}};}
function carSave(){try{localStorage.setItem('sp.career',JSON.stringify(CAR.data));}catch(e){}}
const CAR={data:carLoad(),view:'list',t:null,banner:''};
function carOpen(t){return t==='amateur'||!!CAR.data.champ[CAR_ORDER[CAR_ORDER.indexOf(t)-1]];}
function seededRand(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
/* the draw: you, the weakest, then blocks of 2, 4, 8 (and 16) stronger men, each block seeded so its best meet last */
function seedOrder(n){let o=[1];while(o.length<n){const m=o.length*2;o=o.flatMap(s=>[s,m+1-s]);}return o;}
function carDraw(t){const ids=CAREER.fighters.filter(f=>f.tour===t).sort((a,b)=>a.s-b.s).map(f=>f.id),out=['you',ids[0]];let i=1,size=2;
  while(out.length<CAR_TOUR[t].size){const blk=ids.slice(i,i+size);i+=size;out.push(...seedOrder(blk.length).map(k=>blk[blk.length-k]));size*=2;}return out;}
function carNewRun(t){const run={t,seed:(Date.now()^(Math.random()*1e9))>>>0,ent:[carDraw(t)],round:0,path:[],over:false,won:false,champion:null};CAR.data.runs[t]=run;carSave();return run;}
function carRun(t){return CAR.data.runs[t]||null;}
const carSkill=id=>id==='you'?0.5:CAR_FIGHTER[id].s;
/* everyone else's bouts in round r; mine is decided by the real fight (meWon) */
function carAdvance(run,meWon){const cur=run.ent[run.round],next=[],rnd=seededRand(run.seed+run.round*7919);
  for(let k=0;k<cur.length;k+=2){const a=cur[k],b=cur[k+1];
    if(a==='you'||b==='you'){next.push(meWon?'you':(a==='you'?b:a));continue;}
    const p=1/(1+Math.exp(-(carSkill(a)-carSkill(b))*9));next.push(rnd()<p?a:b);}
  run.ent.push(next);run.round++;
  if(next.length===1){run.over=true;run.champion=next[0];run.won=next[0]==='you';}}
function carOpp(run){const cur=run.ent[run.round],i=cur.indexOf('you');return i<0?null:cur[i^1];}
function carRoundName(run,r){return CAR_ROUND[run.ent[0].length>>r]||'Round';}
/* skill 0 (weaker than Easy) to 1 (past Hard), then the style */
const CAR_SK=[['react',420,150],['defend',.26,.78],['slip',.28,.55],['read',.15,.8],['learn',.35,1],['acc',.7,.97],['aggr',.32,.62],['combo',.25,.7],
  ['tmin',300,120],['tmax',560,240],['punish',.2,1],['mash',.035,.09],['taunt',.05,.02]];
const CAR_CAP={defend:.9,slip:.85,read:.95,learn:1,acc:.98,aggr:.88,combo:.92,punish:1,taunt:.25,mash:.1};
function carProfile(f){const st=CAREER.styles[f.style],p={name:f.name};
  for(const [k,a,b] of CAR_SK)p[k]=a+(b-a)*f.s;
  for(const k in st.mods||{})if(k in p)p[k]*=st.mods[k];
  for(const k in CAR_CAP)p[k]=Math.min(CAR_CAP[k],p[k]);p.react=Math.max(120,p.react);p.tmin=Math.max(90,p.tmin);p.tmax=Math.max(p.tmin+60,p.tmax);
  p.mix=st.mix||null;p.planBias=st.plan||null;p.range=st.range||0;
  const sg=CAREER.sigs[f.sig]||{};p.sig={};for(const k in sg)p.sig[PCODE(k[0]==='R'?1:0,+k[1])]=sg[k];return p;}
function carGrit(run,f){const r=run.round,ult=run.t==='ultimate';return {tough:f.tough*(ult?1+0.07*r:1),power:f.power*(ult?1+0.035*r:1)};}
/* ---------- fights ---------- */
function carFight(){const run=carRun(CAR.t);if(!run||run.over)return;const id=carOpp(run),f=CAR_FIGHTER[id];if(!f)return;
  const s=newSim('cpu',{names:['You',f.name],diff:'career'});s.F[1].ai=makeAI(carProfile(f));const g=carGrit(run,f);s.F[1].tough=g.tough;s.F[1].power=g.power;
  s.career={t:run.t,round:run.round,opp:id,done:false};enterSim(s);startRoundS();beginMode();
  later(900,()=>{if(S&&S.career&&S.career.opp===id)announce(carRoundName(run,run.round)+' · '+f.name,'small',1500);});}
function carResult(){const c=S&&S.career;if(!c||c.done)return;c.done=true;const run=carRun(c.t);if(!run||run.over||run.round!==c.round)return;
  const won=S.matchWinner===0,f=CAR_FIGHTER[c.opp];run.path.push({opp:c.opp,won,how:S.lastKO?'KO':'Decision',rnd:S.round,name:carRoundName(run,run.round)});
  carAdvance(run,won);
  if(!won)while(!run.over)carAdvance(run,false);      // play out the rest of the draw to find the champion
  if(run.won)CAR.data.champ[run.t]=true;
  CAR.banner=won?(run.won?'Champion of the '+CAR_TOUR[run.t].name+'!'+(CAR_ORDER[CAR_ORDER.indexOf(run.t)+1]?' The next tournament is open.':' You have won them all.'):'You beat '+f.name+(S.lastKO?' by knockout.':' on the cards.'))
    :f.name+(S.lastKO?' knocked you out.':' beat you on the cards.')+' The tournament is over for you.';
  carSave();}
/* ---------- screens ---------- */
function carShow(view,t){hideScreens();CAR.view=view;if(t)CAR.t=t;carRender();$('#career').hidden=false;}
function carPips(n,of){let s='';for(let i=0;i<of;i++)s+=i<n?'<i></i>':'<s></s>';return '<span class="cpips" aria-label="'+n+' of '+of+'">'+s+'</span>';}
function carDanger(f,run){return Math.max(1,Math.min(10,Math.round(f.s*8+(f.tour==='ultimate'?1+run.round*0.4:f.tour==='pro'?1:0.5))));}
function carRender(){const box=$('#careerCard');
  if(CAR.view==='list'){
    box.innerHTML='<div class="kicker">Career</div><h2>Choose a tournament</h2><div class="ctours"></div><div class="cacts"><button class="btn" type="button" id="btnCarBack">Back</button></div>';
    const wrap=box.querySelector('.ctours');
    for(const t of CAR_ORDER){const T=CAR_TOUR[t],open=carOpen(t),run=carRun(t),champ=!!CAR.data.champ[t];
      const b=document.createElement('button');b.type='button';b.className='ctour'+(open?'':' locked')+(champ?' champ':'');b.disabled=!open;
      const status=!open?'Locked · win the '+CAR_TOUR[CAR_ORDER[CAR_ORDER.indexOf(t)-1]].short+' first':run&&!run.over?carRoundName(run,run.round)+' next':champ?'Champion':'Not started';
      b.innerHTML='<span class="olvl">'+T.short+'</span><span class="oname"></span><em>'+T.size+' fighters · '+Math.log2(T.size)+' rounds</em><span class="cstat">'+(champ?'★ ':'')+status+'</span>';
      b.querySelector('.oname').textContent=T.name.replace(' Championship','');b.addEventListener('click',()=>{if(open)carShow('tour',t);});wrap.appendChild(b);}
    $('#btnCarBack').addEventListener('click',()=>{$('#career').hidden=true;$('#title').hidden=false;titleStep('menu');});return;}
  const t=CAR.t,T=CAR_TOUR[t];let run=carRun(t);if(!run)run=carNewRun(t);
  const rounds=Math.log2(T.size);let path='';
  for(let r=0;r<rounds;r++){const p=run.path[r],nm=CAR_ROUND[T.size>>r];
    let opp='',res='';if(p){opp=CAR_FIGHTER[p.opp].name;res='<b class="'+(p.won?'w':'l')+'">'+(p.won?'Won':'Lost')+' · '+p.how+(p.how==='KO'?' R'+p.rnd:'')+'</b>';}
    else if(r===run.round&&!run.over){opp=CAR_FIGHTER[carOpp(run)].name;res='<b class="n">Next</b>';}else{opp='';res='<b class="q">·</b>';}
    path+='<li class="'+(r===run.round&&!run.over?'cur':'')+'"><span>'+nm+'</span><span class="pn"></span>'+res+'</li>';}
  box.innerHTML='<div class="kicker">'+T.name+'</div><h2 id="carH"></h2><p class="cbanner" id="carBanner"></p><div class="cgrid"><ol class="cpath">'+path+'</ol><div class="copp" id="carOpp"></div></div><div class="cacts" id="carActs"></div>';
  // names go in as text, never as markup
  box.querySelectorAll('.cpath li').forEach((li,r)=>{const p=run.path[r];li.querySelector('.pn').textContent=p?CAR_FIGHTER[p.opp].name:(r===run.round&&!run.over?CAR_FIGHTER[carOpp(run)].name:'');});
  $('#carBanner').textContent=CAR.banner;$('#carBanner').hidden=!CAR.banner;CAR.banner='';
  const acts=$('#carActs'),btn=(id,label,primary,fn)=>{const b=document.createElement('button');b.type='button';b.id=id;b.className='btn'+(primary?' primary':'');b.textContent=label;b.addEventListener('click',fn);acts.appendChild(b);};
  const opp=$('#carOpp');
  if(!run.over){const f=CAR_FIGHTER[carOpp(run)],st=CAREER.styles[f.style],g=carGrit(run,f);$('#carH').textContent=carRoundName(run,run.round);
    opp.innerHTML='<span class="olvl">Next opponent</span><span class="oname"></span><span class="onick"></span><span class="ostyle"></span><em class="odesc"></em><span class="osig"></span><span class="odanger">Danger '+carPips(carDanger(f,run),10)+'</span>'+(g.tough>1.001?'<span class="otough">Takes '+Math.round((1-1/g.tough)*100)+'% less damage'+(t==='ultimate'&&run.round>0?', tougher every round':'')+'</span>':'');
    opp.querySelector('.oname').textContent=f.name;opp.querySelector('.onick').textContent='"'+f.nick+'" · '+f.from;opp.querySelector('.ostyle').textContent=st.name;
    opp.querySelector('.odesc').textContent=st.desc;opp.querySelector('.osig').textContent='Signature: '+f.sig;
    btn('btnCarFight','Fight',true,()=>trainGate(carFight));btn('btnCarList','Back',false,()=>carShow('list'));}
  else{const ch=run.champion==='you'?'You':CAR_FIGHTER[run.champion].name;$('#carH').textContent=run.won?'Champion':'Tournament over';
    opp.innerHTML='<span class="olvl">'+(run.won?'Your title':'Champion')+'</span><span class="oname"></span><em class="odesc"></em>';opp.querySelector('.oname').textContent=ch;
    opp.querySelector('.odesc').textContent=run.won?'You won all '+rounds+' fights. Start again any time to defend it.':'Try again: the draw and the dice change every time.';
    btn('btnCarAgain',run.won?'Defend the title':'Try again',true,()=>{carNewRun(t);carRender();});
    const nx=CAR_ORDER[CAR_ORDER.indexOf(t)+1];if(run.won&&nx)btn('btnCarNext','Next tournament',false,()=>carShow('tour',nx));
    btn('btnCarList','Back',false,()=>carShow('list'));}}
$('#btnCareer').addEventListener('click',()=>carShow('list'));
