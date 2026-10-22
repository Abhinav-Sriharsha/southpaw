/* South Paw · src/input/local.js
   Turns the local player's keys, stick and buttons into one input word per tick.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= LOCAL INPUT SAMPLING (keyboard + touch -> input word) ================= */
const STICK={on:false,jx:0,jy:0,fwd:0,lat:0};
const TB={block:false};
const LI={act:0,skip:0,ready:0,taunt:0,latch:new Set(),lastPunch:-1e9,vPrev:0,vSince:0};
function resetLocalInput(){LI.act=0;LI.skip=0;LI.taunt=0;LI.ready=0;LI.latch.clear();STICK.fwd=0;STICK.lat=0;if(typeof PBT!=='undefined'){PBT.L.down=PBT.R.down=false;}}
const cR=new V3(),cFw=new V3();
function stickDirs(f){
  if(!STICK.on){STICK.fwd=0;STICK.lat=0;return;}
  const m=Math.hypot(STICK.jx,STICK.jy);if(m<0.3){STICK.fwd=0;STICK.lat=0;return;}
  const ca=cam.ang+(camMode===2?1.15:0);cFw.set(-Math.sin(ca),0,-Math.cos(ca));cR.set(-cFw.z,0,cFw.x);
  const wx=cR.x*STICK.jx-cFw.x*STICK.jy,wz=cR.z*STICK.jx-cFw.z*STICK.jy,wl=Math.hypot(wx,wz)||1;
  const r=relAxes(f),cu=(wx*r.ux+wz*r.uz)/wl,cl=(wx*r.lx+wz*r.lz)/wl;
  const pick=(c,cur)=>{const th=cur&&Math.sign(c)===cur?0.3:0.42;return Math.abs(c)>th?Math.sign(c):0;};
  STICK.fwd=pick(cu,STICK.fwd);STICK.lat=pick(cl,STICK.lat);
}
/* Punch buttons: tap = straight, hold = hook. The stick's up/down at the moment you press picks uppercut or body. */
const HOLD_MS=130;
const PBT={L:{down:false,t:0,v:0,fired:false},R:{down:false,t:0,v:0,fired:false}};
function stickV(){if(STICK.on&&Math.hypot(STICK.jx,STICK.jy)>0.3){const ax=Math.abs(STICK.jx),ay=Math.abs(STICK.jy);
    if(STICK.jy<-0.45&&ay>ax*0.7)return -1;if(STICK.jy>0.45&&ay>ax*0.7)return 1;return 0;}
  const h=MAP.hold,any=arr=>arr.some(c=>keys.has(c)),u=any(h.in),d=any(h.out);return u&&!d?-1:d&&!u?1:0;}
function stickAway(){if(STICK.on)return STICK.fwd<0;return MAP.hold.aw.some(c=>keys.has(c));}
const canFight=()=>!!S&&!G.paused&&(S.state==='fight'||S.state==='down');
function punchDown(h){if(!canFight())return;const b=PBT[h];if(b.down)return;
  if(S.state==='down'){LI.act=1;return;}
  b.down=true;b.t=performance.now();b.v=stickV();b.fired=false;}
function punchUp(h){const b=PBT[h];if(!b.down)return;b.down=false;if(!b.fired)firePunch(h,b.v,false);}
function firePunch(h,v,hold){if(!S||S.state!=='fight')return;const kind=v<0?(hold?3:2):v>0?(hold?5:4):(hold?1:0);LI.act=PCODE(h==='R'?1:0,kind);LI.lastPunch=performance.now();}
function pollHolds(){const now=performance.now();for(const h of ['L','R']){const b=PBT[h];if(b.down&&!b.fired&&now-b.t>=HOLD_MS){b.fired=true;firePunch(h,b.v,true);}}}
function tauntDown(){if(!canFight()||S.state!=='fight')return;LI.taunt=1;}
function dodgeDown(){if(!canFight())return;if(S.state==='down'){LI.act=1;return;}const v=stickV();LI.act=v>0?DODGE_DUCK:stickAway()?DODGE_PULL:DODGE_SLIP;}
function sampleLocal(){
  const f=S.F[LOC()],h=MAP.hold,menu=S.mode==='online'&&!$('#pause').hidden;
  pollHolds();
  const any=arr=>arr.some(c=>keys.has(c)||LI.latch.has(c));
  let kf=(any(h.tw)?1:0)-(any(h.aw)?1:0),kl=(any(h.in)?1:0)-(any(h.out)?1:0),kb=any(h.b);LI.latch.clear();
  stickDirs(f);
  let fwd=STICK.fwd||kf,lat=STICK.lat||kl,blk=kb||TB.block,act=LI.act;LI.act=0;
  const v=stickV(),now=performance.now();
  if(v!==LI.vPrev){LI.vPrev=v;LI.vSince=now;}
  // pushing up or down aims a punch or the guard: hold off circling briefly in case a button follows,
  // and not at all while a punch button is held, just after a punch, or while blocking
  const aiming=PBT.L.down||PBT.R.down||now-LI.lastPunch<300||(!blk&&now-LI.vSince<110);
  if(aiming&&v!==0)lat=0;
  const lowG=false;
  if(menu){fwd=0;lat=0;blk=false;act=0;}
  const tn=LI.taunt;LI.taunt=0;
  const w=enc(fwd,lat,blk,menu?0:act,lowG,LI.ready,LI.skip,!menu&&tn);LI.skip=0;return w;
}
