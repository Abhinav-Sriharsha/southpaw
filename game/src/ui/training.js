/* South Paw · src/ui/training.js
   Training: a short lesson on the heavy bag that teaches the controls one move at a time. Each step says what the move
   is for and which keys or buttons do it, then waits until you have done it; only then does the next one start.
   It runs once before your first fight (trainGate wraps Fight the CPU, Play online and career fights) and any time
   from the Training button next to Pause in Practice. Done once, it is remembered on this device (localStorage sp.trained).
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const TR={on:false,i:0,prog:0,done:false,doneT:0,cont:null,lastAtk:-1,lastAct:'',flags:{},last:null};
const trained=()=>{try{return localStorage.getItem('sp.trained')==='1';}catch(e){return true;}};
function trainGate(fn){if(trained())fn();else startTraining(fn);}
const trK=k=>'<kbd>'+k+'</kbd>';
const isM=(m,hand,kind,target)=>m&&(!hand||m.hand===hand)&&(!kind||m.kind===kind)&&(!target||m.target===target);
/* need: seconds (hold) or a count; ok(f) for holds, hit(m) for punches; touch/keys: how to do it */
const LESSONS=[
 {title:'Step in',why:'The bag is your opponent. Move in until you are close enough to hit it.',keys:'Hold '+trK('D'),touch:'Push the stick toward the bag',need:1,hold:f=>f.inp.fwd>0},
 {title:'Step back',why:'Step out of range to rest and to make him miss.',keys:'Hold '+trK('A'),touch:'Pull the stick away from the bag',need:1,hold:f=>f.inp.fwd<0},
 {title:'Circle',why:'Never stand in a straight line in front of him. Move around him, both ways.',keys:'Hold '+trK('W')+' then '+trK('S'),touch:'Push the stick to one side, then the other',need:2,both:true},
 {title:'Left jab',why:'Your fastest punch. Use it to find your range and set up everything else.',keys:'Tap '+trK('J'),touch:'Tap LEFT',need:3,hit:m=>isM(m,'L','straight','head')},
 {title:'Right cross',why:'The power punch straight down the middle.',keys:'Tap '+trK('K'),touch:'Tap RIGHT',need:3,hit:m=>isM(m,'R','straight','head')},
 {title:'One-two',why:'Jab, then the cross straight after it: the most important combination in boxing.',keys:trK('J')+' then '+trK('K')+', quickly',touch:'LEFT then RIGHT, quickly',need:2,combo:true},
 {title:'Left hook',why:'A short swing from the side. Strongest up close.',keys:'Hold '+trK('J'),touch:'Hold LEFT',need:2,hit:m=>isM(m,'L','hook','head')},
 {title:'Right hook',why:'The big swing from the right. From further out it loops in long.',keys:'Hold '+trK('K'),touch:'Hold RIGHT',need:2,hit:m=>isM(m,'R','hook','head')},
 {title:'Uppercut',why:'Comes up under his guard. Best when he ducks or covers up.',keys:'Hold '+trK('W')+' and tap '+trK('J')+' or '+trK('K'),touch:'Stick up, then tap a punch',need:2,hit:m=>isM(m,null,'upper',null)},
 {title:'Body shot',why:'Punches to the body wear him down. A left hook to the liver can drop a tired man.',keys:'Hold '+trK('S')+' and tap '+trK('J')+' or '+trK('K'),touch:'Stick down, then tap a punch',need:3,hit:m=>isM(m,null,null,'body')},
 {title:'Block',why:'Blocked punches do no damage, but your guard wears: three hard shots in a row break it.',keys:'Hold '+trK('Space'),touch:'Hold BLOCK',need:1.2,hold:f=>f.inp.block&&f.action==='block'},
 {title:'Dodge',why:'Dodge at the right moment and he misses, and your next punch counts double.',keys:trK('Shift')+' (with '+trK('S')+' to duck, '+trK('A')+' to lean back)',touch:'Tap DODGE (stick down to duck, away to lean back)',need:3,slip:true},
];
const trEl=()=>$('#train');
function trRender(){const el=trEl(),L=LESSONS[TR.i];if(!L)return;
  $('#trStep').textContent='Training · '+(TR.i+1)+' of '+LESSONS.length;$('#trTitle').textContent=L.title;$('#trWhy').textContent=L.why;
  $('#trHow').innerHTML=usingTouch?L.touch:L.keys;
  const n=L.hold?0:Math.round(L.need),pr=$('#trProg');
  if(L.hold){pr.innerHTML='<span class="trbar"><i style="width:'+Math.min(100,TR.prog/L.need*100)+'%"></i></span>';}
  else{let s='';for(let k=0;k<n;k++)s+='<i class="'+(k<TR.prog?'on':'')+'"></i>';pr.innerHTML='<span class="trpips">'+s+'</span>';}
  el.classList.toggle('ok',TR.done);$('#trOk').textContent=TR.done?['Nice.','Good.','That is it.','Sharp.'][TR.i%4]:'';}
function startTraining(cont){TR.cont=cont||null;startPractice();TR.on=true;TR.i=-1;
  $('#trEnd').hidden=true;$('#trCard').hidden=false;trEl().hidden=false;helpEl.hidden=true;$('#tTrain').textContent='End training';trNext();}
function trNext(){TR.i++;if(TR.i>=LESSONS.length){trFinish();return;}TR.prog=0;TR.done=false;TR.flags={};TR.lastR=0;TR.last=null;TR.lastAtk=S.F[0].attackId;TR.lastAct=S.F[0].action;trRender();}
function trFinish(){try{localStorage.setItem('sp.trained','1');}catch(e){}TR.done=false;
  $('#trCard').hidden=true;$('#trEnd').hidden=false;$('#trGo').textContent=TR.cont?'Start the fight':'Keep practising';
  $('#trTips').innerHTML=(usingTouch?'<li>Every punch costs stamina. Step out of range to get it back, or tap TAUNT when he is far away.</li><li>Knocked down? Tap any button fast to beat the count.</li>':
    '<li>Every punch costs stamina. Step out of range to get it back, or press '+trK('T')+' to taunt when he is far away.</li><li>Knocked down? Press any key fast to beat the count.</li>')+'<li>Practice has slow motion and replays to work on your timing.</li>';}
function trainStop(){if(!TR.on)return;TR.on=false;trEl().hidden=true;const b=$('#tTrain');if(b)b.textContent='Training';}
/* runs every frame while training (src/core/loop.js) */
function trainUpdate(dt){if(!TR.on||!S||S.mode!=='practice'||G.paused||S.state!=='fight')return;const L=LESSONS[TR.i];if(!L)return;const f=S.F[0];
  if(TR.done){TR.doneT-=dt;if(TR.doneT<=0)trNext();return;}
  // holds are timed in real time (frame times are capped, so a slow phone would otherwise count too little)
  const nowR=performance.now(),s=Math.min(0.25,(nowR-(TR.lastR||nowR))/1000);TR.lastR=nowR;let changed=false;
  if(L.hold&&L.hold(f)){TR.prog+=s;changed=true;}
  if(L.both){const d=f.inp.lat;if(d){const k=d>0?'a':'b';TR.flags[k]=(TR.flags[k]||0)+s;}const p=(TR.flags.a>=0.6?1:0)+(TR.flags.b>=0.6?1:0);if(p!==TR.prog){TR.prog=p;changed=true;}}
  if(f.attackId!==TR.lastAtk){TR.lastAtk=f.attackId;const m=f.move;
    if(L.hit&&L.hit(m)){TR.prog++;changed=true;}
    if(L.combo){const now=nowMs();if(isM(m,'R','straight','head')&&TR.last&&TR.last.jab&&now-TR.last.t<750){TR.prog++;changed=true;TR.last=null;}else TR.last={jab:isM(m,'L','straight','head'),t:now};}}
  if(L.slip&&f.action==='slip'&&TR.lastAct!=='slip'){TR.prog++;changed=true;}
  TR.lastAct=f.action;
  if(TR.prog>=L.need){TR.prog=L.need;TR.done=true;TR.doneT=900;Sfx&&Sfx.react&&Sfx.react('cheer',0.35);changed=true;}
  if(changed)trRender();}
$('#tTrain').addEventListener('click',()=>{if(TR.on)trainStop();else startTraining(null);});
$('#trGo').addEventListener('click',()=>{const c=TR.cont;TR.cont=null;trainStop();if(c)c();});
