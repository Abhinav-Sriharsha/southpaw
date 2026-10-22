/* South Paw · src/ui/screens.js
   Menus and modes: title, pause, end screen, starting a CPU fight, practice and online.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= SCREENS AND MODES ================= */
const MAP={hold:{tw:['KeyD','ArrowRight'],aw:['KeyA','ArrowLeft'],in:['KeyW','ArrowUp'],out:['KeyS','ArrowDown'],b:['Space']},
  press:{KeyJ:'L',KeyF:'L',KeyK:'R',KeyG:'R',KeyL:'R',ShiftLeft:'D',ShiftRight:'D'}};
const SPEEDS=[1,0.5,0.25],SPEED_LABEL=['1×','½×','¼×'],CAM_LABEL=['Broadcast camera','Close camera','Front camera'];
let speedI=0,camMode=0;
const KH_FIGHT='<span><kbd>D</kbd><kbd>A</kbd> in / out</span><span><kbd>W</kbd><kbd>S</kbd> circle</span><span><kbd>J</kbd> left hand</span><span><kbd>K</kbd> right hand</span><span>tap jab/cross, hold hook</span><span><kbd>W</kbd>+punch uppercut</span><span><kbd>S</kbd>+punch body</span><span><kbd>Space</kbd> block</span><span><kbd>Shift</kbd> dodge</span><span><kbd>T</kbd> taunt</span>';
const KEYHELP={cpu:KH_FIGHT+'<span><kbd>Esc</kbd> menu</span>',online:KH_FIGHT+'<span><kbd>Esc</kbd> menu</span>',
  practice:KH_FIGHT.replace('<span><kbd>T</kbd> taunt</span>','')+'<span><kbd>T</kbd> slow-mo</span><span><kbd>C</kbd> camera</span><span><kbd>R</kbd> replay</span><span><kbd>Esc</kbd> pause</span>'};
function hideScreens(){$('#title').hidden=true;$('#end').hidden=true;$('#pause').hidden=true;$('#online').hidden=true;const l=$('#lobby');if(l)l.hidden=true;}
let usingTouch=TOUCH;
function setPlaying(on){document.body.classList.toggle('playing',on);touchEl.hidden=!(on&&usingTouch);tbarEl.hidden=!on;resetStick();TB.block=false;
  document.querySelectorAll('.tb.on').forEach(b=>b.classList.remove('on'));}
const UI={state:'',mode:'',round:-1,match:-1,endShown:false};
function enterSim(s){S=s;resGrace=Math.max(resGrace,2500);document.body.classList.toggle('prac',s.mode==='practice');G.mode=s.mode;G.paused=false;UI.state='';UI.round=-1;UI.match=-1;UI.endShown=false;EVQ.length=0;cam.init=false;resetLocalInput();
  const pr=s.mode==='practice';showBag(pr);B[1].root.visible=!pr;for(const t of trails[1])t.mesh.visible=!pr;acc=0;}
function startAttract(){timers.length=0;
  if(S&&S.mode==='online')netLeave(true);
  const s=newSim('attract');s.F[0].ai=makeAI('normal');s.F[1].ai=makeAI('normal');s.F[0].ai.aggr=0.4;s.F[1].ai.aggr=0.4;enterSim(s);
  rebuildBoxer(0,lookIdx);rebuildBoxer(1,lookIdx);S.F.forEach(resetPose);setState('fight');
  hudEl.hidden=true;helpEl.hidden=true;lbox.classList.remove('on');hideScreens();$('#title').hidden=false;annBox.innerHTML='';popBox.innerHTML='';setPlaying(false);}
/* Full screen: browsers only allow it right after a tap, click or key press, so the first one anywhere asks for it.
   iPhones don't support it for web pages; adding the game to the home screen gives the same result there. */
let fullAsked=false;
function goFull(force){if(fullAsked&&!force)return;fullAsked=true;try{const d=document.documentElement,rq=d.requestFullscreen||d.webkitRequestFullscreen;
  if(rq&&!document.fullscreenElement){const p=rq.call(d,{navigationUI:'hide'});if(p&&p.then)p.then(()=>{try{screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>{});}}catch(e){}}
function beginMode(){
  Sfx.init();goFull(true);timers.length=0;G.paused=false;G.map=MAP;speedI=0;
  hideScreens();annBox.innerHTML='';popBox.innerHTML='';lbox.classList.remove('on');
  hudEl.hidden=false;hudEl.dataset.mode=S.mode==='practice'?'practice':'cpu';hudKey='';hudLabels();renderPips();
  tbarEl.dataset.mode=S.mode;$('#ping').hidden=S.mode!=='online';
  $('#btnQuit').textContent=S.mode==='online'?'Leave match':'Quit to menu';
  if(!usingTouch){helpEl.innerHTML=KEYHELP[S.mode];helpEl.hidden=false;helpEl.classList.remove('fade');later(10000,()=>helpEl.classList.add('fade'));}else helpEl.hidden=true;
  setPlaying(true);canvas.focus({preventScroll:true});checkOrient();}
function startMatch(){G.diff=G.diff||'normal';const s=newSim('cpu',{names:['You',DIFF[G.diff].name],diff:G.diff});s.F[1].ai=makeAI(G.diff);enterSim(s);
  rebuildBoxer(0,lookIdx);rebuildBoxer(1,lookIdx);startRoundS();beginMode();}
function startPractice(){const s=newSim('practice');enterSim(s);rebuildBoxer(0,lookIdx);startPracticeS();
  lastEl.textContent=usingTouch?'Tap a punch button':'Throw a punch';speedEl.textContent=SPEED_LABEL[0];$('#tSpeed').textContent='1×';beginMode();}
function showEnd(){
  const w=S.matchWinner,Lc=LOC(),W=S.F[w],me=S.F[Lc],op=S.F[1-Lc],online=S.mode==='online';
  const nm=i=>online?(i===Lc?'You':S.names[i]):S.names[i];
  $('#endKicker').textContent=(S.lastKO?'Winner by knockout':'Winner on the cards')+' · Round '+S.round+(online?' · Online':'');
  const en=$('#endName');en.textContent=nm(w);en.className='end-name '+(w===0?'r':'b');
  const row=(label,fn)=>'<tr><td>'+label+'</td><td>'+fn(me)+'</td><td>'+fn(op)+'</td></tr>';
  const acc2=f=>f.stats.thrown?Math.round(f.stats.landed/f.stats.thrown*100)+'%':'0%';
  $('#stats').innerHTML='<thead><tr><th></th><th class="'+(Lc===0?'r':'b')+'">'+nm(Lc)+'</th><th class="'+(Lc===0?'b':'r')+'">'+esc(nm(1-Lc))+'</th></tr></thead><tbody>'+
    row('Thrown',f=>f.stats.thrown)+row('Landed',f=>f.stats.landed)+row('Accuracy',acc2)+
    row('Damage',f=>Math.round(f.stats.dmg))+row('Biggest shot',f=>Math.round(f.stats.best))+row('Knockdowns',f=>f.stats.kd)+row('Counters',f=>f.stats.counters)+row('Dodged',f=>f.stats.slips)+row('Parries',f=>f.stats.parries)+'</tbody>';
  const how=S.lastKO?'knocked out':'beat',tail=S.lastKO?' in round '+S.round:' on the cards',oppName=online?S.names[1-Lc]:S.names[1];
  const brag=w===Lc?'I '+how+' '+oppName+tail+(online?' online':'')+' on South Paw. '+me.stats.landed+' of '+me.stats.thrown+' punches landed. Your turn.':oppName+' '+how+' me'+tail+' on South Paw. Rematch incoming.';
  $('#bragText').value=brag;$('#btnCopy').textContent='Copy';$('#btnRematch').textContent='Rematch';$('#rematchNote').textContent='';
  hudEl.hidden=true;helpEl.hidden=true;setPlaying(false);$('#end').hidden=false;}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function syncUI(){
  if(!S||S.mode==='attract')return;
  const st=S.state;
  if((st==='intro')&&(UI.round!==S.round||UI.match!==S.matchId)){UI.round=S.round;UI.match=S.matchId;cam.init=false;hud.rnd.textContent='Round '+S.round;hud.time.textContent='60';hud.time.classList.remove('hurry');renderPips();
    if(UI.endShown){UI.endShown=false;LI.ready=0;$('#end').hidden=true;hudEl.hidden=false;hudLabels();setPlaying(true);}}
  if(st!==UI.state){
    if(st==='replay'){lbox.classList.add('on');hudEl.hidden=true;helpEl.hidden=true;touchEl.hidden=true;tbarEl.hidden=true;}
    else if(UI.state==='replay'){lbox.classList.remove('on');if(!UI.endShown){hudEl.hidden=false;tbarEl.hidden=false;touchEl.hidden=!usingTouch;if(S.mode==='practice'&&!usingTouch)helpEl.hidden=false;}}
    UI.state=st;}
  if(st==='matchEnd'&&!UI.endShown&&S.stateT>=500&&(S.mode!=='online'||NET.confirmedState())){UI.endShown=true;showEnd();}
}
function setPaused(p){
  if(!S||S.mode==='attract'||S.state==='matchEnd'||S.state==='replay')return;
  if(S.mode==='online'){$('#pause').hidden=!p;return;}  // online fights never stop; the menu just floats over it
  G.paused=p;$('#pause').hidden=!p;keys.clear();resetStick();TB.block=false;document.querySelectorAll('.tb.on').forEach(b=>b.classList.remove('on'));
  if(!p)canvas.focus({preventScroll:true});}
function cycleSpeed(){if(S.mode!=='practice')return;speedI=(speedI+1)%SPEEDS.length;S.userScale=SPEEDS[speedI];speedEl.textContent=SPEED_LABEL[speedI];$('#tSpeed').textContent=SPEED_LABEL[speedI];announce(SPEED_LABEL[speedI],'small',700);}
function cycleCam(){camMode=(camMode+1)%3;announce(CAM_LABEL[camMode],'small',800);}
const isPortrait=()=>window.innerHeight>window.innerWidth*1.05;
function checkOrient(){if(TOUCH&&isPortrait()&&S&&S.mode!=='attract'&&S.mode!=='online'&&!G.paused&&S.state!=='matchEnd'&&S.state!=='replay')setPaused(true);}
window.addEventListener('resize',checkOrient);

['pointerdown','keydown'].forEach(t=>window.addEventListener(t,e=>{if(e.type==='keydown'&&(e.key==='Escape'||e.key==='F11'))return;goFull();},{capture:true,once:false,passive:true}));
document.addEventListener('fullscreenchange',()=>{const b=$('#btnFull');if(b)b.textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
