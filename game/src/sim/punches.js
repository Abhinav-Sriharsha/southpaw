/* South Paw · src/sim/punches.js
   The punch book: every punch, its clip and timing, glove position, reach and aim. Numbers come from data/rules.js.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= PUNCH BOOK =================
   Left button = left hand, Right button = right hand.
   Tap = straight, hold = hook. Stick up = uppercut (hold for a power uppercut). Stick down = to the body.
   The right hand has its own clips: cross, a normal hook up close and a long looping hook from range, a normal and a heavy uppercut. */
const KIND_NAMES=['straight','hook','upper','power','bstraight','bhook'];
const TPL={
  jab:{startup:118,active:71,recovery:189,dmg:5,cost:4,stop:45,shake:.13,sev:.45,stun:160,kb:.8,whiff:90,ext:.25,trail:.5,clip:'jab3',f0:1,fw:4,fi:12.5,fr:1,ease:'sine',low:1,blend:0.04},
  crossSolo:{startup:135,active:71,recovery:260,dmg:8,cost:7,stop:55,shake:.18,sev:.55,stun:280,kb:1.1,whiff:120,ext:.3,trail:.8,clip:'rj',f0:2,fw:15,fi:22,fr:36,ease:'sine',low:1,blend:0.06},
  crossChain:{startup:130,active:71,recovery:354,dmg:8,cost:7,stop:55,shake:.18,sev:.55,stun:280,kb:1.1,whiff:120,ext:.3,trail:.8,clip:'jc1',f0:13,fw:15,fi:20,fr:54,fade:0.5,ease:'sine',low:1,blend:0.06},
  hook:{startup:172,active:70,recovery:410,dmg:11,cost:11,stop:80,shake:.3,sev:.8,stun:350,kb:1.6,whiff:180,ext:.67,trail:1,clip:'hook',f0:3,fw:11,fi:14.9,fr:48,fade:0.55,even:2.3,low:1,blend:0.035},
  upL:{startup:234,active:73,recovery:330,dmg:15,cost:14,stop:110,shake:.42,sev:1,stun:440,kb:2.0,whiff:220,ext:.55,trail:1,clip:'upL',f0:4,fw:14,fi:20,fr:42,fade:0.45,ease:'sine',low:1,blend:0.035},
  upS:{startup:225,active:73,recovery:312,dmg:15,cost:14,stop:110,shake:.42,sev:1,stun:440,kb:2.0,whiff:220,ext:.55,trail:1,clip:'upS',f0:4,fw:14,fi:19,fr:42,fade:0.45,ease:'sine',low:1,blend:0.035},
  rhook:{startup:172,active:70,recovery:410,dmg:11,cost:11,stop:80,shake:.3,sev:.8,stun:350,kb:1.6,whiff:180,ext:.67,trail:1,clip:'rhN',f0:0,fw:12,fi:14.6,fr:32,fade:0.55,even:2.83,low:1,blend:0.035},
  rhookL:{startup:300,active:72,recovery:440,dmg:13,cost:13,stop:95,shake:.36,sev:.9,stun:390,kb:1.9,whiff:230,ext:.7,trail:1,clip:'rhL',f0:0,fw:22,fi:26,fr:44,fade:0.5,even:2.89,low:1,blend:0.04},
  ruN:{startup:234,active:73,recovery:330,dmg:15,cost:14,stop:110,shake:.42,sev:1,stun:440,kb:2.0,whiff:220,ext:.55,trail:1,clip:'ruN',f0:0,fw:14,fi:19,fr:33,fade:0.45,ease:'sine',low:1,blend:0.035},
  ruH:{startup:234,active:73,recovery:330,dmg:15,cost:14,stop:110,shake:.42,sev:1,stun:440,kb:2.0,whiff:220,ext:.55,trail:1,clip:'ruH',f0:0,fw:12,fi:18,fr:32,fade:0.45,ease:'sine',low:1,blend:0.035}
};
const MOVES={};
/* hz: how far the hips travel forward during a punch. Clip root motion (hzK) plus a lunge (cm) for clips made for closer range */
function hzAt(m,fr){let z=0;if(m.hzK){const C=CL[m.ci],i=clamp(Math.floor(fr),0,C.n-1);z=(C.hp[i*3+2]-CL[0].hp[2])*m.hzK;}
  if(m.lunge){const w=fr<=m.fi?clamp((fr-m.f0)/Math.max(1,m.fi-m.f0),0,1):clamp(1-(fr-m.fi)/Math.max(1,m.fr-m.fi),0,1);z+=m.lunge*(w*w*(3-2*w));}return z;}
function addMove(key,tpl,o){const m=Object.assign({},TPL[tpl],o);m.key=key;m.ci=CI[m.clip];m._ref=1;m._id='M:'+key;
  if(m.mir){m.low=0;m.hzK=m.hzK||0.6;}
  if(m.power){m.startup=Math.round(m.startup*1.3);m.dmg=Math.round(m.dmg*1.3);m.cost=Math.round(m.cost*1.4);m.stop=Math.round(m.stop*1.25);m.stun=Math.round(m.stun*1.2);m.kb*=1.2;}
  if(m.target==='body'){m.startup=Math.round(m.startup*1.05);m.cost+=1;m.stun=Math.round(m.stun*0.8);m.bk=1;}
  // where this glove really is at the moment of impact, measured on our own skeleton
  const v=blankVis();v.a1=m.ci;v.t1=m.fi;v.aw=1;v.bw=1;v.low=m.low;v.hipR=m.low===0?1:0;v.mir=m.mir?1:0;v.msk=m.msk?1:0;v.bk=m.bk||0;v.hz=hzAt(m,m.fi);
  const p=fkLocal(v,m.hand==='R'?B_RH:B_LH,[0,7,0]);m.g=[p.x,p.y,p.z];
  const tf=m.target==='body'?BODY_FWD:HEAD_FWD;m.ideal=m.g[2]+tf+(m.target==='body'?0.10:0.17);m.reach=m.ideal+0.1;
  MOVES[key]=m;return m;}
// left hand
addMove('L0','jab',{hand:'L',kind:'straight',target:'head',name:'Jab'});
addMove('L1','hook',{hand:'L',kind:'hook',target:'head',name:'Left hook'});
addMove('L2','upL',{hand:'L',kind:'upper',target:'head',name:'Left uppercut'});addMove('L2s','upS',{hand:'L',kind:'upper',target:'head',name:'Left uppercut'});
addMove('L3','upL',{hand:'L',kind:'upper',power:1,target:'head',name:'Power uppercut'});addMove('L3s','upS',{hand:'L',kind:'upper',power:1,target:'head',name:'Power uppercut'});
addMove('L4','jab',{hand:'L',kind:'straight',target:'body',name:'Body jab'});
addMove('L5','hook',{hand:'L',kind:'hook',target:'body',name:'Liver shot'});
// right hand
addMove('R0','crossSolo',{hand:'R',kind:'straight',target:'head',lunge:-15,name:'Cross'});
addMove('Rc','crossChain',{hand:'R',kind:'straight',target:'head',name:'Cross'});
addMove('R1','rhook',{hand:'R',kind:'hook',target:'head',name:'Right hook'});addMove('R1L','rhookL',{hand:'R',kind:'hook',target:'head',lunge:24,name:'Long right hook'});
addMove('R2','ruN',{hand:'R',kind:'upper',target:'head',lunge:22,name:'Right uppercut'});addMove('R2s','ruN',{hand:'R',kind:'upper',target:'head',lunge:10,name:'Right uppercut'});
addMove('R3','ruH',{hand:'R',kind:'upper',power:1,target:'head',lunge:46,name:'Power uppercut'});addMove('R3s','ruH',{hand:'R',kind:'upper',power:1,target:'head',lunge:36,name:'Power uppercut'});
addMove('R4','crossSolo',{hand:'R',kind:'straight',target:'body',lunge:-15,name:'Body cross'});
addMove('R5','rhook',{hand:'R',kind:'hook',target:'body',name:'Body hook'});
const SHEET=RULES.punches;
for(const k in SHEET){const m=MOVES[k],v=SHEET[k];m.dmg=v[0];m.cost=v[1];m.pow=!!v[2];m.drain=v[3]||0;}
/* aim pass: every head punch gets an arm swing that lifts the glove to the opponent's jaw at its impact frame */
const AIM_Y=(()=>{const v=blankVis();return fkLocal(v,B_HEAD,HEAD_OFF).y-0.07;})();
function aimW(m,fr){const w=fr<=m.fi?clamp((fr-m.f0)/Math.max(1,m.fi-m.f0),0,1):clamp(1-(fr-m.fi)/Math.max(1,Math.max(m.fr,m.fi+6)-m.fi),0,1);return w*w*(3-2*w);}
function impactVis(m,am){const v=blankVis();v.a1=m.ci;v.t1=m.fi;v.aw=1;v.bw=1;v.low=m.low;v.hipR=m.low===0?1:0;v.mir=m.mir?1:0;v.msk=m.msk?1:0;v.bk=m.bk||0;v.hz=hzAt(m,m.fi);
  if(am){v.am=am;v.amx=m.ax[0];v.amy=m.ax[1];v.amz=m.ax[2];v.amh=m.hand==='R'?1:0;}return v;}
for(const k in MOVES){const m=MOVES[k];m.aim=0;m.ax=[1,0,0];if(m.target!=='head')continue;
  const hb=m.hand==='R'?B_RH:B_LH,ab=BIDX[m.hand==='R'?'RightArm':'LeftArm'];
  const g0=fkLocal(impactVis(m,0),hb,[0,7,1]),gx=g0.x,gy=g0.y,gz=g0.z,s0=fkLocal(impactVis(m,0),ab,[0,0,0]);
  const vx=gx-s0.x,vy=gy-s0.y,vz=gz-s0.z;let cx=-vz,cz=vx;const cl=Math.sqrt(cx*cx+cz*cz)||1;m.ax=[cx/cl,0,cz/cl];   // axis = v x up
  const need=AIM_Y-gy;if(Math.abs(need)<0.02)continue;
  let th=clamp(need/(Math.sqrt(vx*vx+vz*vz)+0.05),-0.3,0.9);
  for(let it=0;it<4;it++){const y=fkLocal(impactVis(m,th),hb,[0,7,1]).y,got=y-gy;if(Math.abs(got)<1e-4)break;th=clamp(th*need/got,-0.3,0.9);}
  m.aim=th;const p=fkLocal(impactVis(m,th),hb,[0,7,1]);m.g=[p.x,p.y,p.z];m.ideal=m.g[2]+HEAD_FWD+0.17;m.reach=m.ideal+0.1;}
const {HP0,ST0,ST_RATE,ST_DELAY,ST_BLOCK,GAS_UNLOCK,GUARD_HITS,GUARD_HEAL,GB_STUN,CTR,KD_HP,KD_ST,KD_TAPS,WOB_MS}=RULES;
const isAtk=a=>a==='atk';
/* Input codes for punches and dodges (4 bits): 1-6 left hand, 7-12 right hand (straight, hook, uppercut, power uppercut, body straight, body hook); 13 slip, 14 duck, 15 pull back */
const PCODE=(hand,kind)=>1+hand*6+kind;
const DODGE_SLIP=13,DODGE_DUCK=14,DODGE_PULL=15;
