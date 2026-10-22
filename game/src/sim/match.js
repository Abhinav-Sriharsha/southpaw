/* South Paw · src/sim/match.js
   Input words, replay recording, round and match flow, and step(): one 120 Hz tick of the fight.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= INPUT WORDS =================
   One small integer per player per tick: bits 0-1 in/out, 2-3 circle, 4 block, 5-8 punch or dodge pressed this tick, 9 low guard, 10 ready, 11 skip, 12 taunt. */
const NEUTRAL=5,EDGE_MASK=~((15<<5)|(1<<11)|(1<<12));
const enc=(fwd,lat,blk,act,lowG,ready,skip,taunt)=>(fwd+1)|((lat+1)<<2)|((blk?1:0)<<4)|(act<<5)|((lowG?1:0)<<9)|((ready?1:0)<<10)|((skip?1:0)<<11)|((taunt?1:0)<<12);
function applyWord(f,w,pw){const fwd=(w&3)-1,lat=((w>>2)&3)-1,act=(w>>5)&15,pf=(pw&3)-1,pl=((pw>>2)&3)-1;
  if(fwd&&fwd!==pf)f.inp.pf=fwd;if(lat&&lat!==pl)f.inp.pl=lat;
  f.inp.fwd=fwd;f.inp.lat=lat;f.inp.block=!!((w>>4)&1);f.inp.lowG=!!((w>>9)&1);if(act)f.inp.buf={a:act,t:nowMs()};else if((w>>12)&1)f.inp.buf={a:TAUNT,t:nowMs()};}
function clearInp(f){f.inp.fwd=0;f.inp.lat=0;f.inp.block=false;f.inp.lowG=false;f.inp.buf=null;f.inp.pf=0;f.inp.pl=0;}

/* ================= RECORDING (for replays; rewritten during rollback) ================= */
const REC=1200;const rec=[];for(let i=0;i<REC;i++)rec.push({a:{},b:{},g:{tx:0,tz:0,bob:0,flash:0},ev:[]});
const copyInto=(o,v)=>{for(const k of ALLK)o[k]=v[k];};

/* ================= MATCH FLOW (inside the sim, timed in ticks) ================= */
function setState(s){S.state=s;S.stateT=0;}
function addT(ms,k){S.timers.push({ms,k});}
function annEv(text,cls,ms,tag){ev({ty:'ann',text,cls,ms,k:'a'+S.matchId+'.'+S.round+'.'+tag});}
function startRoundS(){S.F.forEach(f=>{if(S.round>1)corner(f);resetPose(f);});S.F.forEach((f,i)=>{if(f.ai)aiRoundStart(f.ai,f,S.F[1-i]);});S.timer=RULES.ROUND_SECONDS;S.scale=1;S.hitstop=0;S.matchWinner=-1;S.timers=[];S.down=null;S.koKind='K.O.';setState('intro');
  addT(300,'annRound');addT(1750,'fight');}
function startPracticeS(){resetPose(S.F[0]);freshHealth(S.F[0]);Object.assign(S.bag,{x:0,z:0,tx:0,tz:0,wx:0,wz:0,bob:0,bobV:0,flash:0});setState('intro');S.timers=[];
  addT(250,'annPrac');addT(1300,'pfight');}
function restartMatchS(){S.matchId++;S.wins=[0,0];S.round=1;S.ready=[0,0];S.lastKO=false;S.F.forEach(f=>{f.stats=newStats();freshHealth(f);});startRoundS();}
function triggerKO(a,o,e,clip){
  if(!grounded(o.action))o.koClip=clip||(a.move&&a.move.kind==='hook'?CI.ko2:CI.ko);
  if(S.state!=='fight'&&S.state!=='down'){o.action='ko';o.actionT=0;return;}
  if(o.action!=='ko'){o.action='ko';o.actionT=0;}
  if(a.action==='taunt'){a.action='idle';a.actionT=0;}
  S.down=null;setState('ko');S.koWinner=a.i;S.koTick=S.recN;S.koPos=[e.x,e.y,e.z];S.lastKO=true;
  S.scale=0.18;S.hitstop=240;
  ev({ty:'ko',by:a.i,to:o.i,k:'k'+S.matchId+'.'+S.round});
  addT(1400,'scale1');addT(900,'win');addT(3000,'afterKO');addT(260,'koBell');addT(180,'koAnn');}
function timeUp(){setState('timeup');S.lastKO=false;annEv('Time!','',1300,'t');ev({ty:'sfx',n:'bell',a:2,k:'b2.'+S.matchId+'.'+S.round});addT(1400,'decide');}
function roundEnd(w){setState('roundEnd');
  if(w>=0){S.wins[w]++;const f=S.F[w];if(f.action!=='ko'){f.action='win';f.actionT=0;}S.matchWinner=w;}
  ev({ty:'roundEnd',w,k:'r'+S.matchId+'.'+S.round});addT(2300,'next');}
function startReplayS(kind){
  if(kind==='prac'){if(S.state!=='fight'||S.recN<60)return;const end=S.recN-1,start=Math.max(S.recN-REC+2,end-240,0);S.rp={pos:start,start,end,ko:-1,kind};}
  else{const end=Math.min(S.recN-1,S.koTick+360),start=Math.max(S.recN-REC+2,S.koTick-300,0);if(end-start<60){setState('post');roundEnd(S.koWinner);return;}
    S.rp={pos:start,start,end,ko:S.koTick,kind};}
  S.skip=[0,0];setState('replay');}
function finishReplayS(){if(S.rp.kind==='prac'){S.rp=null;setState('fight');}else{S.rp=null;setState('post');roundEnd(S.koWinner);}}
function judge(){const a=S.F[0],b=S.F[1];return Math.abs(a.rdmg-b.rdmg)<1?-1:a.rdmg>b.rdmg?0:1;}
function fire(k){
  switch(k){
    case 'annRound':annEv('Round '+S.round,'',1350,'r');ev({ty:'sfx',n:'bell',a:1,k:'b1.'+S.matchId+'.'+S.round});break;
    case 'fight':setState('fight');annEv('Fight!','fight',760,'f');ev({ty:'fight',k:'f'+S.matchId+'.'+S.round});break;
    case 'annPrac':annEv('Practice','',1100,'p');ev({ty:'sfx',n:'bell',a:1,k:'bp'+S.matchId});break;
    case 'pfight':setState('fight');break;
    case 'scale1':if(S.state!=='ko'||S.stateT>1300)S.scale=1;break;
    case 'win':{const a=S.F[S.koWinner];if(a&&a.action!=='ko'){a.action='win';a.actionT=0;}break;}
    case 'koBell':ev({ty:'sfx',n:'bell',a:3,k:'b3.'+S.matchId+'.'+S.round});break;
    case 'koAnn':annEv(S.koKind,'ko',2100,'k');break;
    case 'afterKO':if(S.mode==='attract'){S.F.forEach(f=>{freshHealth(f);resetPose(f);});S.scale=1;setState('fight');}else startReplayS('ko');break;
    case 'decide':roundEnd(judge());break;
    case 'next':if(S.matchWinner>=0&&S.wins[S.matchWinner]>=RULES.ROUNDS_TO_WIN){setState('matchEnd');S.endTick=S.tick;}else{S.round++;startRoundS();}break;
  }
}

/* ================= STEP: one 120 Hz tick of the whole fight ================= */
function step(W){
  const T=S.tick;frameEv=[];
  for(const f of S.F)copyInto(f.prev,f.vis);
  const bp=S.bagPrev,bg=S.bag;bp.tx=bg.tx;bp.tz=bg.tz;bp.bob=bg.bob;bp.flash=bg.flash;
  S.stateT+=STEP;
  if(S.timers.length){const due=[];for(let i=0;i<S.timers.length;i++){const t=S.timers[i];t.ms-=STEP;if(t.ms<=0){due.push(t.k);S.timers.splice(i,1);i--;}}for(const k of due)fire(k);}
  for(let i=0;i<2;i++){const f=S.F[i],w=W?W[i]:null,has=w!==null&&w!==undefined;
    if(has){S.ready[i]=(w>>10)&1;if((w>>11)&1)S.skip[i]=1;}
    if(S.state==='fight'){if(has)applyWord(f,w,S.lastW[i]);else if(f.ai)aiThink(f.ai,f,S.F[1-i]);else clearInp(f);}
    else{clearInp(f);
      if(S.state==='down'&&S.down&&S.down.i===i&&!S.down.up){if(has){if((w>>5)&15)S.down.prog++;}else if(f.ai&&Math.random()<f.ai.mash)S.down.prog++;}}
    if(has)S.lastW[i]=w;}
  if(S.state==='replay'){const rp=S.rp;
    const sp=rp.kind==='prac'?0.4:(rp.pos<rp.ko?0.35+0.65*smooth(16,90,rp.ko-rp.pos):1);rp.pos+=sp;
    const need=S.mode==='online'?(S.skip[0]&&S.skip[1]):(S.skip[0]||S.skip[1]);
    if(rp.pos>=rp.end||need)finishReplayS();
    S.tick=T+1;return;}
  if(S.state==='matchEnd'&&S.mode==='online'&&S.ready[0]&&S.ready[1]&&S.stateT>800)restartMatchS();
  if(S.hitstop>0){S.hitstop-=STEP;S.tick=T+1;return;}
  const dt=STEP/1000*S.scale*S.userScale;
  if(prac()){stepFighter(S.F[0],dt);stepBag(dt);updateAnim(S.F[0],dt);}
  else{stepFighter(S.F[0],dt);stepFighter(S.F[1],dt);if(S.state==='down'&&S.down)stepDown(dt);spacing();updateAnim(S.F[0],dt);updateAnim(S.F[1],dt);
    if(S.state==='fight'&&(S.mode==='cpu'||S.mode==='online')){S.timer-=dt;if(S.timer<=0){S.timer=0;timeUp();}}}
  const r=rec[S.recN%REC];copyInto(r.a,S.F[0].vis);copyInto(r.b,S.F[1].vis);r.g.tx=bg.tx;r.g.tz=bg.tz;r.g.bob=bg.bob;r.g.flash=bg.flash;r.ev=frameEv;S.recN++;
  S.tick=T+1;
}
function simHash(s){let h=2166136261;const mix=v=>{const n=Math.round(v*1e5)|0;h^=n;h=Math.imul(h,16777619);};
  mix(s.tick);mix(s.timer);mix(s.hitstop);mix(s.round);for(const ch of s.state)mix(ch.charCodeAt(0));if(s.down){mix(s.down.prog);mix(s.down.t);}
  for(const f of s.F){mix(f.x);mix(f.z);mix(f.yaw);mix(f.hp);mix(f.gw);mix(f.gassed?1:0);mix(f.rdmg);mix(f.stam);mix(f.kd);mix(f.actionT);mix(f.attackId);mix(f.hitId);mix(f.chF.t);mix(f.chS.t);mix(f.vis.t1);mix(f.kx);mix(f.kd);
    for(const ch of f.action)mix(ch.charCodeAt(0));}
  return h>>>0;}
