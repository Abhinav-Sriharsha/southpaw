/* South Paw · src/ai/cpu.js
   The CPU opponent: watches the player, learns habits, picks game plans and punches.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= CPU (offline only): watches you, learns your habits, and changes its game plan =================
   What it tracks about you through the round and the whole match:
   - your punch mix (straights, hooks, uppercuts; head or body) and what you tend to throw next after each punch
   - how you defend its punches (high guard, low guard, slip, duck, pull back, or not at all)
   - which of its own punches land on you, your work rate, whether you miss
   It uses that to pick punches that beat your defence, guard against your favourite follow-ups,
   punish your misses, and choose a game plan each round (pressure, body work, boxing at range, countering). */
const DIFF=CPU_LEVELS;   // data/cpu.js
function newPM(){return {kind:{straight:2,hook:1,upper:1},tgt:{head:3,body:1},mk:{},last:'',lastT:-1e9,times:[],
  def:{block:1,low:0.6,slip:0.5,duck:0.5,pull:0.5,none:1.2},res:{},seenAtk:-1,seenRes:-1,myAtk:-1,myDone:true,myCat:'',myCtr:false,opWhiffT:-1e9};}
/* d: a difficulty name from data/cpu.js, or a full profile (a career fighter, src/ui/career.js) that can also carry a style:
   mix (weight per punch kind: straight, hook, upper, body, power), sig (extra weight per punch code), planBias (multiplies
   each game plan's score) and range (metres added to the distance he likes to fight at). */
function makeAI(d){const P=typeof d==='string'?DIFF[d]:d;return Object.assign({next:0,fwd:0,lat:0,blockUntil:0,low:false,seen:-1,q:[],plan:'pressure',replanAt:0,readUntil:0,ctrAtk:-1,pm:newPM(),d:typeof d==='string'?d:'career',mix:null,sig:null,planBias:null,range:0},P);}
const catOf=m=>m.target==='body'?'body':m.kind;
function resOf(pm,c){return pm.res[c]||(pm.res[c]={t:2,l:0.8});}
const rate=(pm,c)=>{const r=resOf(pm,c);return r.l/r.t;};
function decayTable(o,k){for(const key in o)o[key]*=k;}
function predictNext(pm){const row=pm.mk[pm.last];if(!row)return null;let tot=0,best=null,bc=0;for(const k in row){tot+=row[k];if(row[k]>bc){bc=row[k];best=k;}}return tot>=2.5?{key:best,p:bc/tot}:null;}
function aiObserve(ai,me,op,d,now){
  const pm=ai.pm,keep=1-0.03*ai.learn;
  if(isAtk(op.action)&&op.attackId!==pm.seenAtk){pm.seenAtk=op.attackId;const m=op.move;
    decayTable(pm.kind,keep);decayTable(pm.tgt,keep);pm.kind[m.kind]=(pm.kind[m.kind]||0)+1;pm.tgt[m.target]++;
    if(pm.last&&now-pm.lastT<900){const row=pm.mk[pm.last]||(pm.mk[pm.last]={});decayTable(row,keep);row[m.key]=(row[m.key]||0)+1;}
    pm.last=m.key;pm.lastT=now;pm.times.push(now);while(pm.times.length&&now-pm.times[0]>5000)pm.times.shift();}
  if(isAtk(op.action)&&op.resolved&&pm.seenRes!==op.attackId){pm.seenRes=op.attackId;if(!op.landed&&me.action!=='block'&&me.action!=='slip')pm.opWhiffT=now;}
  if(isAtk(me.action)&&me.attackId!==pm.myAtk){pm.myAtk=me.attackId;pm.myDone=false;pm.myCat=catOf(me.move);pm.myCtr=me.attackId===ai.ctrAtk;}
  if(!pm.myDone&&isAtk(me.action)&&me.attackId===pm.myAtk&&me.resolved){pm.myDone=true;
    const landed=me.landed&&op.action==='hit',r=resOf(pm,pm.myCat);r.t=r.t*keep+1;r.l=r.l*keep+(landed?1:0);
    if(pm.myCtr){const c=resOf(pm,'counter');c.t=c.t*keep+1;c.l=c.l*keep+(landed?1:0);}
    decayTable(pm.def,keep);
    if(landed)pm.def.none++;else if(op.action==='block')pm.def[op.lowGuard?'low':'block']++;else if(op.action==='slip')pm.def[['slip','duck','pull'][op.dk]]++;}
}
function share(pm,k){const d=pm.def;return d[k]/(d.block+d.low+d.slip+d.duck+d.pull+d.none);}
const PLAN_NOTE={pressure:'walk him down and keep the pressure on.',pressureDuck:"he keeps ducking. Get close and bring the uppercut.",pressureSlip:"he slips the straights. Get close and throw hooks.",body:"he's covering up. Break that guard.",box:'stay long and work behind the jab.',counter:'let him come to you, then counter.'};
function aiPlan(ai,me,op,announce){
  const pm=ai.pm,opRate=pm.times.length/5,noise=()=>Math.random()*(1.25-ai.learn);
  const sc={pressure:1+(op.stam<45?0.6:0)+(op.hp<me.hp-15?0.6:0)+(opRate<0.6?0.4:0)+(share(pm,'duck')*2.2+share(pm,'slip')*1.2)*ai.learn+noise(),
    body:0.55+share(pm,'block')*2.4*ai.learn+(op.stam<40?0.4:0)+noise(),
    box:0.85+(me.hp<op.hp-15?0.7:0)+rate(pm,'straight')*0.9+noise(),
    counter:0.7+Math.min(opRate,2)*0.45*ai.learn+rate(pm,'counter')*0.9+noise()};
  if(ai.planBias)for(const k in ai.planBias)if(k in sc)sc[k]*=ai.planBias[k];   // a style's favourite game plan
  let best='pressure';for(const k in sc)if(sc[k]>sc[best])best=k;
  const changed=best!==ai.plan;ai.plan=best;
  const why=best==='pressure'&&share(pm,'duck')>0.25?'pressureDuck':best==='pressure'&&share(pm,'slip')>0.25?'pressureSlip':best;
  if(false)ev({ty:'note',text:S.names[me.i]+"'s corner: "+PLAN_NOTE[why],k:'n'+S.matchId+'.'+S.round+'.'+best+'.'+Math.round(nowMs()/4000)});
}
function aiRoundStart(ai,me,op){ai.q=[];ai.blockUntil=0;ai.next=0;ai.seen=-1;ai.readUntil=0;ai.replanAt=nowMs()+9000;aiPlan(ai,me,op,S.round>1);}
function judgeLead(me,op){return me.rdmg-op.rdmg;}
const AI_MOVES=[[PCODE(0,0),'straight',1.1],[PCODE(1,0),'straight',1],[PCODE(0,1),'hook',0.9],[PCODE(1,1),'hook',0.85],
  [PCODE(0,2),'upper',0.55],[PCODE(1,2),'upper',0.55],[PCODE(0,4),'body',0.55],[PCODE(1,4),'body',0.5],[PCODE(0,5),'body',0.6],[PCODE(1,5),'body',0.5],[PCODE(0,3),'upper',0.12],[PCODE(1,3),'upper',0.12]];
function aiChoose(ai,me,op,d,finish){
  const pm=ai.pm,L=ai.learn,cand=[];let tot=0;
  for(const [code,cat,base] of AI_MOVES){const m=moveFor(me,code);if(!m)continue;
    if(d>m.ideal-HEAD_FWD+(cat==='straight'?0.22:0.24))continue;              // out of range (the wind-up closes the last bit)
    let w=base*(0.35+rate(pm,cat))*Math.sqrt(m.dmg/8);
    if(code===PCODE(0,3)||code===PCODE(1,3))w*=1+6*share(pm,'block')*L;      // a man who covers up gets his guard broken
    if(cat==='upper')w*=1+4*share(pm,'duck')*L;                                // duckers eat uppercuts
    if(cat==='hook')w*=1+2*share(pm,'slip')*L;                                 // slippers walk into hooks
    if(cat==='straight')w*=1+1.4*share(pm,'pull')*L;
    if(ai.plan==='body'&&(cat==='body'||code===PCODE(0,3)||code===PCODE(1,3)))w*=1.9;if(ai.plan==='box'&&cat==='straight')w*=1.7;if(ai.plan==='pressure'&&cat==='hook')w*=1.3;
    if(finish&&(cat==='hook'||cat==='upper'))w*=1.9;
    if(me.stam<m.cost*2.2&&cat!=='straight')w*=0.3;
    if(code===PCODE(0,5)&&op.gassed)w*=1+6*L;    // he's punched himself out: the left hook to the liver drops him
    if(ai.mix){const k=code===PCODE(0,3)||code===PCODE(1,3)?'power':cat;w*=ai.mix[k]||1;}if(ai.sig&&ai.sig[code])w*=ai.sig[code];   // style and signature punch
    w=Math.pow(w,0.6+0.8*L);cand.push([code,w]);tot+=w;}
  if(!cand.length)return null;let r=Math.random()*tot;for(const [c,w] of cand){if((r-=w)<=0)return c;}return cand[0][0];}
const COMBOS={1:[[7],[1],[7,2]],7:[[2],[2,9]],2:[[9],[7]],5:[[2],[8]],6:[[2],[1]],8:[[3],[1]],11:[[2]],12:[[2]]};
function aiCombo(ai,me,code,now){if(Math.random()>ai.combo)return;const opts=COMBOS[code];if(!opts)return;const seq=opts[(Math.random()*opts.length)|0];
  let t=now;const m=moveFor(me,code);t+=(m?m.startup+m.active:200)+50;for(const c of seq){ai.q.push({c,at:t});const mm=MOVES[(c>6?'R':'L')+((c-1)%6)];t+=(mm?mm.startup+mm.active:200)+60;}}
function aiMove(me,fw,la){const inp=me.inp;if(fw&&fw!==inp.fwd)inp.pf=fw;if(la&&la!==inp.lat)inp.pl=la;inp.fwd=fw;inp.lat=la;}
function aiThink(ai,me,op){
  const inp=me.inp,r=relAxes(me),d=r.d-HEAD_FWD,now=nowMs(),pm=ai.pm;const press=c=>{inp.buf={a:c,t:now};};
  if(grounded(me.action)||grounded(op.action)||me.action==='win'||me.action==='taunt'){aiMove(me,0,0);inp.block=false;return;}
  aiObserve(ai,me,op,d,now);
  if(now>ai.replanAt){ai.replanAt=now+8000+Math.random()*4000;aiPlan(ai,me,op,true);}
  if(ai.q.length&&now>=ai.q[0].at){const c=ai.q.shift().c;if(d<1.42&&!isAtk(op.action))press(c);else ai.q=[];}
  // 1) see the punch coming and defend it
  if(isAtk(op.action)&&op.attackId!==ai.seen&&op.actionT>=ai.react&&op.actionT<op.su&&d<op.move.reach+0.15){
    ai.seen=op.attackId;const m=op.move,left=op.su-op.actionT;
    if(Math.random()<ai.defend*(me.hp<30?1.15:1)){
      const right=Math.random()<ai.acc;
      if(left>MOVES.L0.startup+30&&d<MOVES.L0.ideal-HEAD_FWD+0.08&&me.stam>10&&Math.random()<0.15+rate(pm,'counter')*0.5*ai.learn){press(PCODE(0,0));ai.ctrAtk=me.attackId+1;}
      else if(left>=45&&me.slipCd<=0&&me.stam>12&&Math.random()<ai.slip*(m.target==='body'?0.25:1)){
        let dk=m.kind==='upper'?2:m.kind==='hook'?1:(Math.random()<.6?0:1);if(!right)dk=(Math.random()*3)|0;inp.lat=Math.random()<.5?1:-1;press(13+dk);}
      else{ai.blockUntil=now+left+m.active+90;ai.low=right?m.target==='body':m.target!=='body';}}}
  // 2) read the player's habits: guard against the follow-up they usually throw
  if(!isAtk(op.action)&&now>ai.readUntil&&now-pm.lastT<380&&d<1.3){const pn=predictNext(pm);
    if(pn&&Math.random()<ai.read*pn.p*0.09){const mv=MOVES[pn.key];if(mv){ai.blockUntil=now+280;ai.low=mv.target==='body';ai.readUntil=now+650;}}}
  if(now<ai.blockUntil){inp.block=true;inp.lowG=ai.low;aiMove(me,0,0);return;}
  inp.block=false;inp.lowG=false;
  // 3) counters: after a clean dodge, and when the player misses
  if(me.counterWin>0&&d<1.25&&!inp.buf){press(d<1.1?PCODE(Math.random()<.5?0:1,1):PCODE(1,0));return;}
  if(now-pm.opWhiffT<330&&d<1.27&&!inp.buf&&Math.random()<ai.punish*0.14){pm.opWhiffT=-1e9;press(d<1.12?PCODE(Math.random()<.5?0:1,1):PCODE(1,0));return;}
  // 4) footwork and offence on a rhythm
  if(now<ai.next){aiMove(me,ai.fwd,ai.lat);return;}
  ai.next=now+rand(ai.tmin,ai.tmax);
  const finish=op.hp<30||op.wob>0||op.gassed,hurt=me.hp<25||me.wob>0,tired=me.gassed||me.stam<25;
  if(d>1.45&&me.tauntCd<=0&&!hurt&&me.hp>op.hp+12&&(op.wob>0||op.hp<40||op.stam<25)&&!isAtk(op.action)&&Math.random()<ai.taunt){press(TAUNT);return;}
  let want=ai.plan==='pressure'||ai.plan==='body'?0.98:ai.plan==='box'?1.26:1.12;if(finish)want=1.0;
  want+=ai.range||0;   // an out-boxer likes it long, a swarmer close
  if(share(pm,'duck')*ai.learn>0.25)want=Math.min(want,0.92);   // uppercuts need to be close
  if(hurt||tired)want=1.45;
  const cornered=Math.max(Math.abs(me.x),Math.abs(me.z))>3.0,escLat=(r.lx*-me.x+r.lz*-me.z)>0?1:-1;
  if(cornered&&(hurt||Math.random()<0.5)){ai.fwd=0;ai.lat=escLat;}
  else if(d>want+0.12){ai.fwd=1;ai.lat=Math.random()<.25?(Math.random()<.5?1:-1):0;}
  else if(d<want-0.12){ai.fwd=-1;ai.lat=Math.random()<.35?(Math.random()<.5?1:-1):0;}
  else{ai.fwd=0;ai.lat=Math.random()<.35?(Math.random()<.5?1:-1):0;}
  let ag=ai.aggr*(ai.plan==='pressure'?1.25:ai.plan==='counter'?0.6:ai.plan==='box'?0.9:1)*(finish?1.6:1)*(hurt?0.5:1)*(tired?0.4:1);
  if(S.timer<15&&S.mode==='cpu')ag*=judgeLead(me,op)>0?0.75:1.3;   // protect a lead late, chase when behind
  if(d<1.36&&Math.random()<ag){const c=aiChoose(ai,me,op,d,finish);if(c){ai.fwd=0;ai.lat=0;press(c);aiCombo(ai,me,c,now);}}
  else if(hurt&&Math.random()<.4){ai.blockUntil=now+rand(250,520);ai.low=Math.random()<pm.tgt.body/(pm.tgt.body+pm.tgt.head);}
  aiMove(me,ai.fwd,ai.lat);
}
