/* South Paw · src/sim/footwork.js
   Stepping, walking and circling.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= FOOTWORK ================= */
const RM={};for(const n of ['fwd','back','sl','sr','walkf','walkb','ml','mr','ll','lr','dodge'])RM[CI[n]]={rx:AD.meta[n].rx,rz:AD.meta[n].rz,n:AD.meta[n].n};
const FOOT={
  fTap:{c:CI.fwd,rate:1.7,s:2,e:30},bTap:{c:CI.back,rate:1.7,s:0,e:27},
  fWalk:{c:CI.walkf,rate:2.0,s:0,e:30,loop:true,plants:[15,30]},bWalk:{c:CI.walkb,rate:1.8,s:0,e:26,loop:true,plants:[16,26]},
  lTap:{c:CI.sl,rate:1.8,s:0,e:26},rTap:{c:CI.sr,rate:1.8,s:0,e:30},
  lMid:{c:CI.ml,rate:1.6,s:0,e:25},rMid:{c:CI.mr,rate:1.6,s:0,e:25},
  lLong:{c:CI.ll,rate:1.5,s:0,e:24},rLong:{c:CI.lr,rate:1.5,s:0,e:25}
};
for(const k in FOOT){FOOT[k]._ref=1;FOOT[k]._id='F:'+k;REFS['F:'+k]=FOOT[k];}
for(const k in MOVES)REFS['M:'+k]=MOVES[k];
const T_WALK=200,T_MID=130,T_LONG=330;
const newChan=()=>({def:null,kind:null,dir:0,t:0,c0:-1,t0:0,x:1,xd:0.1,hold:0,queued:false,ending:false,stopAt:0,w:0,lastC:-1});
function chStart(f,ch,def,kind,dir,t,xd){
  f.evc++;
  if(ch.def&&ch.w>0.05){if(!(ch.x<0.5&&ch.c0>=0)){ch.c0=ch.def.c;ch.t0=ch.t;}ch.x=0;ch.xd=xd;}else{ch.c0=-1;ch.x=1;}
  ch.def=def;ch.kind=kind;ch.dir=dir;ch.t=t;ch.ending=false;ch.lastC=def.c;
  if(S.mode!=='attract'&&(S.mode!=='practice'||f.i===0))ev({ty:'sfx',n:'step',k:'s'+f.i+'.'+f.evc+'.'+S.matchId});
}
function chSwitch(f,ch,def,kind,t){if(t===undefined){const u=clamp((ch.t-ch.def.s)/(ch.def.e-ch.def.s),0,1);t=def.s+u*(def.e-def.s);}chStart(f,ch,def,kind,ch.dir,t,0.12);}
function chEnd(f,ch){f.evc++;ch.kind=null;ch.queued=false;ch.ending=false;}
function rootVel(c,t){const R=RM[c];if(!R)return [0,0];const i=clamp(Math.floor(t),0,R.n-1);return [R.rx[i]*30,R.rz[i]*30];}
function chVel(ch){if(!ch.def||ch.w<0.001)return [0,0];const v1=rootVel(ch.def.c,ch.t);let vx=v1[0]*ch.def.rate,vz=v1[1]*ch.def.rate;
  if(ch.x<1&&ch.c0>=0){const v0=rootVel(ch.c0,ch.t0);vx=lerp(v0[0]*ch.def.rate,vx,ch.x);vz=lerp(v0[1]*ch.def.rate,vz,ch.x);}
  return [vx*ch.w,vz*ch.w];}
