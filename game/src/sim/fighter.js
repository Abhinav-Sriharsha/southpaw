/* South Paw · src/sim/fighter.js
   Fighter state, the animation state machine, starting punches, dodges, taunts and blocks.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= SIM STATE ================= */
const newStats=()=>({thrown:0,landed:0,dmg:0,best:0,slips:0,counters:0,kd:0,parries:0});
function freshHealth(f){f.hp=HP0;f.cap=100;f.hpGhost=HP0;f.ghostDelay=0;f.body=100;f.stam=ST0;f.stamMax=100;f.guard=100;f.wob=0;f.kd=0;f.sinceHit=9999;f.dheat=0;
  f.gw=0;f.gwT=0;f.gassed=false;f.lastPunch=-1e9;f.rdmg=0;}
function newFighter(i){const f={i,side:1,x:0,z:0,yaw:0,vx:0,vz:0,kx:0,kz:0,action:'idle',actionT:0,move:null,su:0,rc:0,
  landed:false,resolved:true,tired:false,swish:false,stunMs:0,heavy:false,hitSide:1,hitId:0,flash:0,counterWin:0,slipCd:0,slipSide:1,dk:0,combo:0,comboN:0,attackId:0,koClip:CI.ko,riseClip:CI.gL,rise0:0,riseMs:1300,riseP:0,hc:-1,hv:1e9,hvd:0,bhc:-1,bhv:1e9,bhd:0,bhId:0,tauntClip:CI.t1,tauntMs:2000,tauntCd:0,tauntN:0,tauntSafe:false,stamR:1,
  blockStun:0,lowGuard:false,guardHit:0,parryOk:true,gw:0,gwT:0,gassed:false,lastPunch:-1e9,rdmg:0,
  it:i*20,evc:0,chF:newChan(),chS:newChan(),hs:{x:0,r:0,vx:0,vr:0},vis:blankVis(),prev:blankVis(),actKey:'',bt:1,bd:0,low0:1,
  stats:newStats(),ai:null,inp:{fwd:0,lat:0,block:false,lowG:false,buf:null,pf:0,pl:0}};freshHealth(f);return f;}
let S=null;
function newSim(mode,o){o=o||{};return {mode,tick:0,state:'fight',stateT:0,timer:60,round:1,wins:[0,0],hitstop:0,hitTarget:-1,scale:1,userScale:1,
  koWinner:-1,koTick:0,koPos:[0,0,0],lastKO:false,koKind:'K.O.',matchWinner:-1,timers:[],recN:0,rp:null,ready:[0,0],skip:[0,0],lastW:[5,5],matchId:o.matchId||0,down:null,endTick:0,
  F:[newFighter(0),newFighter(1)],bag:{x:0,z:0,tx:0,tz:0,wx:0,wz:0,bob:0,bobV:0,flash:0},bagPrev:{tx:0,tz:0,bob:0,flash:0},
  st:{thrown:0,landed:0,best:0,combo:0,lastLandT:-1e9},names:o.names||['You','CPU'],diff:o.diff||'normal'};}
const nowMs=()=>S.tick*STEP;
const prac=()=>S.mode==='practice';
const tgt=f=>prac()?S.bag:S.F[1-f.i];
function relAxes(f){const t=tgt(f),dx=t.x-f.x,dz=t.z-f.z,d=dhyp(dx,dz)||1e-4,ux=dx/d,uz=dz/d;return {d,ux,uz,lx:f.side*uz,lz:-f.side*ux};}
const footFree=f=>f.action==='idle'||f.action==='walk'||f.action==='block';
const grounded=a=>a==='down'||a==='rise'||a==='ko'||a==='liver';
const EVQ=[];let frameEv=[];
function ev(o){EVQ.push(o);}

/* ================= FIGHTER SIM ================= */
function stepFeet(f,dt){
  const ms=dt*1000,inp=f.inp,free=footFree(f),rateMul=f.action==='block'?0.6:(f.gassed?0.8:1)*(f.wob>0?0.6:1);
  const F1=f.chF,S1=f.chS;
  if(!free){if(F1.kind)chEnd(f,F1);if(S1.kind)chEnd(f,S1);inp.pf=0;inp.pl=0;}
  if(free){
    const pf=inp.pf;inp.pf=0;
    if(pf){if(F1.kind==='tap'&&F1.dir===pf)F1.queued=true;else if(F1.kind==='walk'&&F1.dir===pf)F1.ending=false;
      else{chStart(f,F1,pf>0?FOOT.fTap:FOOT.bTap,'tap',pf,(pf>0?FOOT.fTap:FOOT.bTap).s,0.08);F1.hold=0;F1.queued=false;}}
    else if(!F1.kind&&inp.fwd){chStart(f,F1,inp.fwd>0?FOOT.fWalk:FOOT.bWalk,'walk',inp.fwd,0,0.12);F1.hold=T_WALK;}
    if(F1.kind){
      const held=inp.fwd===F1.dir;if(held)F1.hold+=ms;
      if(F1.kind==='tap'&&held&&F1.hold>T_WALK)chSwitch(f,F1,F1.dir>0?FOOT.fWalk:FOOT.bWalk,'walk');
      F1.t+=dt*30*F1.def.rate*rateMul;if(F1.x<1)F1.x=Math.min(1,F1.x+dt/F1.xd);
      if(F1.kind==='walk'){const n=F1.def.e;
        if(!held&&!F1.ending){F1.ending=true;const p=F1.def.plants.find(q=>q>F1.t+1);F1.stopAt=p!==undefined?p:F1.def.plants[0]+n;}
        if(held)F1.ending=false;
        if(F1.ending&&F1.t>=F1.stopAt)chEnd(f,F1);
        else if(F1.t>=n){F1.t-=n;if(F1.ending)F1.stopAt-=n;}
      }else if(F1.t>=F1.def.e){
        if(F1.queued){F1.queued=false;chStart(f,F1,F1.def,'tap',F1.dir,F1.def.s,0.08);if(!held)F1.hold=0;}
        else if(held)chStart(f,F1,F1.dir>0?FOOT.fWalk:FOOT.bWalk,'walk',F1.dir,0,0.1);
        else chEnd(f,F1);
      }
    }
    const latDir=inp.lat*f.side,pl=inp.pl*f.side;inp.pl=0;
    const tapD=d=>d>0?FOOT.lTap:FOOT.rTap,midD=d=>d>0?FOOT.lMid:FOOT.rMid,longD=d=>d>0?FOOT.lLong:FOOT.rLong;
    if(pl){if(S1.kind&&S1.dir===pl)S1.queued=true;else{chStart(f,S1,tapD(pl),'tap',pl,0,0.08);S1.hold=0;S1.queued=false;}}
    else if(!S1.kind&&latDir){chStart(f,S1,longD(latDir),'long',latDir,0,0.1);S1.hold=T_LONG;}
    if(S1.kind){
      const held=latDir===S1.dir;if(held)S1.hold+=ms;
      if(S1.kind==='tap'&&held&&S1.hold>T_MID&&S1.t<10)chSwitch(f,S1,midD(S1.dir),'mid',2);
      else if(S1.kind==='mid'&&held&&S1.hold>T_LONG)chSwitch(f,S1,longD(S1.dir),'long');
      S1.t+=dt*30*S1.def.rate*rateMul;if(S1.x<1)S1.x=Math.min(1,S1.x+dt/S1.xd);
      if(S1.t>=S1.def.e){
        if(held){const lg=S1.hold>T_LONG;chStart(f,S1,lg?longD(S1.dir):midD(S1.dir),lg?'long':'mid',S1.dir,0,0.08);}
        else if(S1.queued){S1.queued=false;chStart(f,S1,tapD(S1.dir),'tap',S1.dir,0,0.08);S1.hold=0;}
        else chEnd(f,S1);
      }
    }
  }
  for(const ch of [F1,S1]){const tg=ch.kind?1:0,k=1-dexp(-dt*(tg?25:12));ch.w+=(tg-ch.w)*k;if(!ch.kind&&ch.w<0.001)ch.w=0;}
  const a=chVel(F1),b=chVel(S1),both=F1.w>0.05&&S1.w>0.05?0.8:1;
  const lx=(a[0]+b[0])*both*rateMul,lz=(a[1]+b[1])*both*rateMul,c=dcos(f.yaw),s=dsin(f.yaw);
  return [lx*c+lz*s,-lx*s+lz*c,S1.w>0.05&&F1.w<0.05];
}

function atkFrame(f){
  const m=f.move,T=f.actionT,su=f.su,sw=su*m.ext;
  if(m.even){
    const rate=m.even*(m.startup/su),lin=m.f0+T*0.03*rate,w=clamp((T-su-m.active)/f.rc,0,1);
    const endF=m.fr,fr=lin<endF-6?lin:Math.min(endF,endF-6+6*easeOut(clamp((lin-(endF-6))/6/1.5,0,1)));
    const snap=clamp((T-sw)/(su-sw),0,1);
    return {fr,gs:T<su?1+0.12*snap:1,tr:T<sw?0:T<su?snap:Math.max(0,1-(T-su)/(m.active+120)),aw:1-smooth(m.fade,1,w)};
  }
  if(T<sw)return {fr:lerp(m.f0,m.fw,easeOut(T/sw)),gs:1,tr:0};
  if(T<su){const w=(T-sw)/(su-sw);return {fr:lerp(m.fw,m.fi,w),gs:1+0.18*w,tr:w};}
  if(T<su+m.active){const q=clamp((T-su)/50,0,1);return {fr:m.fi,gs:lerp(0.86,1,easeOut(q)),tr:1-0.6*(T-su)/m.active};}
  const w=clamp((T-su-m.active)/f.rc,0,1),e=m.ease==='sine'?(1-dcos(Math.PI*w))/2:easeOut(w);
  return {fr:lerp(m.fi,m.fr,e),gs:1,tr:Math.max(0,0.4-w*1.6),aw:m.fade?1-smooth(m.fade,1,w):1};
}

function updateAnim(f,dt){
  const v=f.vis,act=f.action,T=f.actionT;
  f.it=(f.it+dt*30)%(CL[0].n-1);v.it=f.it;
  const F1=f.chF,S1=f.chS;
  v.fw=F1.w;v.fc=F1.w>0?F1.lastC:-1;v.ft=F1.t;v.fc0=F1.c0;v.ft0=F1.t0;v.fx=F1.x;
  v.sw=S1.w;v.sc=S1.w>0?S1.lastC:-1;v.st=S1.t;v.sc0=S1.c0;v.st0=S1.t0;v.sx=S1.x;
  let a1=-1,t1=0,low=1,gsL=1,gsR=1,trL=0,trR=0,aw=1,mir=0,msk=0,bk=0,hz=0,hipR=0;
  if(isAtk(act)){const m=f.move,r=atkFrame(f);a1=m.ci;t1=r.fr;
    let awCut=1;
    if(f.cut>=0){const hEnd=Math.max(f.su,f.cutT)+m.active*0.6+f.rc*0.3;
      if(T<hEnd)t1=f.cut;
      else if(prac()){t1=f.cut;awCut=1-smooth(hEnd,f.su+m.active+f.rc,T);}   // the bag doesn't give way: pull straight back from the contact pose
      else{f.cut=-1;f.evc++;}}
    aw=Math.min(awCut,r.aw===undefined?1:r.aw);mir=m.mir?1:0;msk=m.msk?1:0;low=m.low;hipR=m.low===0?1:0;
    if(m.hand==='L'){gsL=r.gs;trL=r.tr*m.trail;}else{gsR=r.gs;trR=r.tr*m.trail;}
    if(m.bk){const su=f.su;bk=T<su?easeOut(clamp(T/(su*0.8),0,1)):1-smooth(su+m.active,su+m.active+f.rc*0.8,T);}
    hz=hzAt(m,t1)*aw;v.am=m.aim*aimW(m,t1)*aw;v.amx=m.ax[0];v.amy=m.ax[1];v.amz=m.ax[2];v.amh=m.hand==='R'?1:0;}
  else if(act==='block'){low=0;bk=0;
    if(f.bhc>=0&&f.bhv<f.bhd){const sg=BSEG[f.bhc],u=f.bhv/f.bhd;a1=f.bhc;t1=u<0.3?lerp(sg[0],sg[1],1-(1-u/0.3)*(1-u/0.3)):lerp(sg[1],sg[2],(u-0.3)/0.7);}
    else{a1=CI.block;t1=T<90?lerp(8,19,easeOut(T/90)):19+0.8*dsin((T-90)/180);}}
  else if(act==='hit'||((act==='idle'||act==='walk')&&f.hc>=0&&f.hv<f.hvd&&f.hvd>0)){
    // the reaction keeps playing out after the stun ends, fading under your footwork until you do something else
    const u=clamp(f.hv/f.hvd,0,1),hc=f.hc>=0?f.hc:CI.hitL,sg=HSEG[hc];a1=hc;t1=u<0.3?lerp(sg[0],sg[1],1-(1-u/0.3)*(1-u/0.3)):lerp(sg[1],sg[2],(u-0.3)/0.7);
    if(act==='hit')aw=u<0.85?1:1-smooth(0.85,1,u)*0.6;
    else{const u0=clamp(f.stunMs/f.hvd,0,0.95);aw=1-smooth(u0,1,u);low=aw*(1-Math.max(F1.w,S1.w));}}
  else if(act==='down'){const fr=downFrame(f,T);if(fr<0){a1=f.koClip;t1=Math.min(CL[f.koClip].n-1,T*0.03*KDF_SP);}else{a1=f.koClip===CI.kdf?f.riseClip:f.koClip;t1=fr;}}
  else if(act==='liver'){a1=CI.liv;t1=Math.min(CL[CI.liv].n-1,T*0.03);}
  else if(act==='ko'){a1=f.koClip;t1=Math.min(f.koClip===CI.liv?LIV_HOLD:CL[f.koClip].n-1,T*0.03*(f.koClip===CI.kdf?KDF_SP:1));}
  else if(act==='rise'){a1=f.riseClip;const n=CL[f.riseClip].n-1;t1=lerp(f.rise0,n,easeInOut(clamp(T/f.riseMs,0,1)));}
  else if(act==='taunt'){a1=f.tauntClip;const n=CL[a1].n-1,fr=T*0.03*TAUNT_SP;t1=Math.min(n,fr);}
  else if(act==='win'){a1=CI.win;const n=CL[CI.win].n-1;t1=T<1800?Math.min(n,6+T*0.03):Math.min(n,60+12*(1-dcos((T-1800)/600)));}
  const phase=act==='down'&&f.koClip===CI.kdf&&T>=fallMs(f)?'down2':act;
  const key=act==='walk'?'idle':phase+(isAtk(act)?f.attackId:act==='hit'?f.hitId:act==='block'&&f.bhc>=0&&f.bhv<f.bhd?'h'+f.bhId:'');
  if(key!==f.actKey){const was=f.actKey;v.a0=v.aw<0.05?-1:v.a1;v.t0=v.t1;v.mir0=v.mir;v.msk0=v.msk;f.hipR0=v.hipR;f.low0=v.low;f.bt=0;
    f.bd=isAtk(act)?f.move.blend:act==='ko'&&/^down/.test(was)?0.35:act==='block'&&/h\d/.test(key)?0.05:(BLEND[phase]||0.08);f.actKey=key;f.evc++;}
  f.bt+=dt;v.bw=f.bd>0?easeOut(clamp(f.bt/f.bd,0,1)):1;v.a1=a1;v.t1=t1;v.low=lerp(f.low0,low,v.bw);v.aw=aw;v.mir=mir;v.msk=msk;v.hipR=isAtk(act)?hipR:(v.bw<1?(f.hipR0||0):0);
  if(!isAtk(act)){v.am*=dexp(-dt*14);if(Math.abs(v.am)<1e-3)v.am=0;}
  const kb=dexp(-dt*14);v.bk=bk>v.bk||isAtk(act)||act==='block'?bk:v.bk*kb;
  if(f.gassed&&(act==='idle'||act==='walk'))v.bk=Math.max(v.bk,0.3+0.15*dsin(nowMs()/230));v.hz=isAtk(act)?hz:v.hz*kb;if(Math.abs(v.hz)<0.05)v.hz=isAtk(act)?v.hz:0;
  if(act==='slip'){const u=clamp(T/SLIP_MS,0,1),a=u<0.35?easeOut(u/0.35):u<0.5?1:1-easeInOut((u-0.5)/0.5);
    if(f.dk===0){v.sl=f.slipSide*a;v.sd=0.55*a;v.dl=0;}else if(f.dk===1){v.sl=0;v.sd=1.25*a;v.dl=0;}else{v.sl=0;v.sd=0.12*a;v.dl=a;}}
  else{const k=dexp(-dt*25);v.sl*=k;v.sd*=k;v.dl*=k;if(Math.abs(v.sl)<0.002)v.sl=0;if(v.sd<0.002)v.sd=0;if(v.dl<0.002)v.dl=0;}
  v.ev=f.evc;v.x=f.x;v.z=f.z;v.yaw=f.yaw;v.hx=f.hs.x;v.hr=f.hs.r;
  if(f.wob>0){const w=Math.min(1,f.wob/600);v.hx+=dsin(nowMs()/240+f.i)*0.035*w;v.hr+=dsin(nowMs()/310+f.i*2)*0.08*w;}v.flash=f.flash;v.gsL=gsL;v.gsR=gsR;v.trL=trL;v.trR=trR;
}
function resetPose(f){
  f.x=f.i?1.0:-1.0;f.z=0;f.yaw=f.i?-Math.PI/2:Math.PI/2;f.vx=f.vz=f.kx=f.kz=0;
  f.action='idle';f.actionT=0;f.move=null;f.flash=0;f.counterWin=0;f.blockStun=0;f.lowGuard=false;
  f.resolved=true;f.landed=false;f.cut=-1;f.slipCd=0;f.it=f.i*20;f.combo=0;f.comboN=0;f.tired=false;f.chF=newChan();f.chS=newChan();
  f.hc=-1;f.hv=1e9;f.hvd=0;f.bhc=-1;f.bhv=1e9;f.bhd=0;f.tauntCd=0;f.tauntSafe=false;f.riseP=0;
  Object.assign(f.hs,{x:0,r:0,vx:0,vr:0});Object.assign(f.inp,{fwd:0,lat:0,block:false,lowG:false,buf:null,pf:0,pl:0});
  Object.assign(f.vis,blankVis());f.actKey='idle';f.bt=1;f.bd=0;f.low0=1;f.vis.x=f.x;f.vis.z=f.z;f.vis.yaw=f.yaw;f.vis.it=f.it;Object.assign(f.prev,f.vis);
  if(f.ai){f.ai.next=0;f.ai.blockUntil=0;f.ai.q=[];f.ai.fwd=0;f.ai.lat=0;f.ai.seen=-1;}
}
/* every round starts fresh: full health, full stamina, guard and knockdowns reset */
function corner(f){freshHealth(f);}
const MIN_D=0.78,BAG_MIN=0.55,BOUND=3.6,SLIP_MS=380,RISE_MS=1300;
function canAct(f){const a=f.action;if(f.blockStun>0)return false;if(a==='idle'||a==='walk'||a==='block')return true;
  if(a==='taunt')return f.actionT>f.tauntMs*0.72;
  if(isAtk(a)&&f.landed&&f.actionT>f.su+f.move.active+45)return 'cancel';
  if(isAtk(a)&&f.move.kind==='straight'&&f.move.hand==='L'&&f.actionT>f.su+f.move.active+30)return 'cancel';return false;}
const UPPER_SPLIT={L:(MOVES.L2.g[2]+MOVES.L2s.g[2])/2+0.1,R:(MOVES.R2.g[2]+MOVES.R2s.g[2])/2+0.1},UPPER_SPLIT_F={L:(MOVES.L2.g[2]+MOVES.L2s.g[2])/2+0.02,R:(MOVES.R2.g[2]+MOVES.R2s.g[2])/2+0.02};
const HOOK_SPLIT=(MOVES.R1.g[2]+MOVES.R1L.g[2])/2;
function targetDist(f){const t=tgt(f);return dhyp(t.x-f.x,t.z-f.z)-(prac()?0:HEAD_FWD+0.23);}   // fights keep a glove's width more room than before
function moveFor(f,code){const hand=((code-1)/6)|0,kind=(code-1)%6,H=hand?'R':'L';
  if(H==='R'&&kind===0&&isAtk(f.action)&&f.move&&f.move.hand==='L'&&f.move.kind==='straight'&&f.move.target==='head'&&f.actionT<f.su+f.move.active+f.rc*0.55)return MOVES.Rc;
  if(H==='R'&&kind===1)return MOVES[targetDist(f)>HOOK_SPLIT?'R1L':'R1'];
  if(kind===2||kind===3){const short=targetDist(f)<(prac()?UPPER_SPLIT:UPPER_SPLIT_F)[H];return MOVES[H+kind+(short?'s':'')];}
  return MOVES[H+kind];}
function spend(f,n){f.stam=Math.max(0,f.stam-n);if(f.stam<=0&&!f.gassed){f.gassed=true;ev({ty:'pop',f:f.i,text:'Gassed',cls:'gb',k:'g'+f.i+'.'+S.matchId+'.'+Math.round(nowMs())});}}
function startAttack(f,code){
  const m=moveFor(f,code);if(!m)return;
  f.tired=false;spend(f,m.cost);f.lastPunch=nowMs();
  const slow=f.wob>0?1.15:1;
  f.action='atk';f.move=m;f.actionT=0;f.landed=false;f.resolved=false;f.swish=false;f.cut=-1;f.dodge=0;
  f.su=m.startup*slow;f.rc=m.recovery*slow;f.attackId++;f.stats.thrown++;if(prac())S.st.thrown++;
}
/* Dodges: slip (sideways lean) beats straights, duck beats straights and hooks, pull back beats every head shot. Spamming them gets tiring. */
function startSlip(f,dk){f.action='slip';f.dk=dk;f.actionT=0;f.slipCd=520;spend(f,6+3*f.dheat);f.dheat+=1;
  f.slipSide=f.inp.lat?f.inp.lat*f.side:-(f.slipSide||1);}
function decide(f){const inp=f.inp,ca=canAct(f);
  if(ca&&inp.buf){const c=inp.buf.a;
    if(c===TAUNT){if(ca===true&&f.action!=='taunt'&&f.tauntCd<=0&&!prac())startTaunt(f,false);inp.buf=null;}
    else if(c>=13){if(ca===true&&f.slipCd<=0&&f.stam>=5){startSlip(f,c-13);inp.buf=null;}}else{if(!f.gassed)startAttack(f,c);inp.buf=null;}}
  if(canAct(f)===true){if(inp.block){if(f.action!=='block'){f.action='block';f.actionT=0;f.parryOk=f.ai?Math.random()<f.ai.parry:true;}f.lowGuard=false;}else if(f.action!=='idle'&&f.action!=='taunt')f.action='idle';}}
/* Taunts: drop your hands and play to the crowd. Finish it and you get a breather and a cheer.
   Get caught in the middle of one and the punch lands harder. Celebrating a knockdown is free. */
const TAUNT=16;
function startTaunt(f,safe){const o=S.F[1-f.i],hurt=o.wob>0||o.hp<35||grounded(o.action);
  f.tauntClip=hurt?CI.t3:(f.tauntN++%2?CI.t2:CI.t1);f.action='taunt';f.actionT=0;f.tauntSafe=!!safe;
  f.tauntMs=(CL[f.tauntClip].n-1)/(0.03*TAUNT_SP);f.tauntCd=f.tauntMs+2500;
  ev({ty:'taunt',f:f.i,k:'t'+f.i+'.'+S.matchId+'.'+S.round+'.'+f.tauntN+'.'+Math.round(nowMs()/100)});}
const mk=(a,tag)=>tag+a.i+'.'+a.attackId+'.'+S.matchId;
function resolveBag(a,ct){
  a.resolved=true;const m=a.move,B0=S.bag,st=S.st;
  const rx=B0.x-a.x,rz=B0.z-a.z,c=dcos(a.yaw),s=dsin(a.yaw);
  if(!ct){ev({ty:'sfx',n:'whiff',k:mk(a,'x')});a.rc+=m.whiff;a.stam=Math.max(0,a.stam-m.cost*0.6);st.combo=0;ev({ty:'last',text:m.name+' · miss',k:mk(a,'l')});return;}
  const dx=ct.nx,dz=ct.nz,p=clamp(m.dmg/16,0.25,1.25);
  a.landed=true;st.landed++;
  st.combo=nowMs()-st.lastLandT<750?st.combo+1:1;st.lastLandT=nowMs();if(st.combo>st.best)st.best=st.combo;
  const imp=p*0.62;B0.wx+=dx*imp;B0.wz+=dz*imp;
  if(m.kind==='hook'){const sd=m.hand==='L'?1:-1;B0.wx+=-c*imp*0.6*sd;B0.wz+=s*imp*0.6*sd;}
  if(m.kind==='upper')B0.bobV+=1.1*p;
  B0.flash=1;S.hitstop=Math.max(S.hitstop,m.stop);
  fx({x:ct.x,y:ct.y,z:ct.z,p,blk:false,dx,dz,bag:true,to:-1,by:a.i,tr:m.shake*0.45,kick:p*0.7,cr:p*0.25,kind:m.kind,target:m.target,hand:m.hand,combo:st.combo,k:mk(a,'g')});
  ev({ty:'last',text:m.name+' · '+m.dmg,k:mk(a,'l')});
  if(st.combo>=2)ev({ty:'popAt',x:B0.x,y:2.2,z:B0.z,text:st.combo+' hit combo',cls:'combo',k:mk(a,'c')});
}
function fx(e){frameEv.push(e);e.ty='fx';ev(e);}
function whiff(a,m){a.rc+=m.whiff;ev({ty:'sfx',n:'whiff',k:mk(a,'x')});}
