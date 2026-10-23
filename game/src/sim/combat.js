/* South Paw · src/sim/combat.js
   Hit detection, damage, blocks, guard breaks, counters, knockdowns and stamina each tick.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ===== HIT DETECTION =====
   Every tick of a punch's active frames, the real glove (from the attacker's current pose) is tested against
   the defender's real head sphere and torso capsule (from his current pose), so a punch lands exactly where it looks like it lands.
   A raised guard is hit if the glove meets the defender's gloves, head or torso. */
const GLOVE_R=0.095,HEAD_R=0.11,TORSO_R=0.13,GUARD_R=0.095,SLOP=0.02,B_SP0=BIDX.Spine,B_SP2=BIDX.Spine2;
const CT={x:0,y:0,z:0,blk:false,body:false,smother:false};
function cp(p){return [p.x,p.y,p.z];}
function segDist(p,a,b){const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],l2=abx*abx+aby*aby+abz*abz||1e-9;
  const t=clamp(((p[0]-a[0])*abx+(p[1]-a[1])*aby+(p[2]-a[2])*abz)/l2,0,1);
  const x=a[0]+abx*t-p[0],y=a[1]+aby*t-p[1],z=a[2]+abz*t-p[2];return Math.sqrt(x*x+y*y+z*z);}
const d3=(p,q)=>Math.sqrt((p[0]-q[0])*(p[0]-q[0])+(p[1]-q[1])*(p[1]-q[1])+(p[2]-q[2])*(p[2]-q[2]));
function contact(a,o){
  const m=a.move,g=cp(simPoint(a,m.hand==='R'?B_RH:B_LH,[0,7,1]));
  const head=cp(simHead(o)),t0=cp(simPoint(o,B_SP0,[0,4,2])),t1=cp(simPoint(o,B_SP2,[0,9,1]));
  const hitHead=d3(g,head)<HEAD_R+GLOVE_R+SLOP,hitBody=segDist(g,t0,t1)<TORSO_R+GLOVE_R+SLOP;
  CT.x=g[0];CT.y=g[1];CT.z=g[2];CT.blk=false;CT.body=m.target==='body';
  if(o.action==='block'){
    const gl=cp(simPoint(o,B_LH,[0,7,1])),gr=cp(simPoint(o,B_RH,[0,7,1]));
    if(hitHead||hitBody||d3(g,gl)<GUARD_R+GLOVE_R+SLOP||d3(g,gr)<GUARD_R+GLOVE_R+SLOP){CT.blk=true;return CT;}
    return null;}
  CT.smother=false;
  if(m.target==='body'?hitBody:hitHead)return CT;
  if(m.target==='body'&&hitHead){CT.body=false;return CT;}      // a body shot that meets a dropping head still lands
  if(m.target==='head'&&hitBody&&m.kind!=='upper'){CT.body=true;CT.smother=true;return CT;}   // too close: a straight or hook jams into the chest
  return null;}
/* dodges are decided the moment the punch arrives: the right dodge, timed, makes it miss */
function dodgeCheck(a,o){const m=a.move,body=m.target==='body';
  if(!(o.action==='slip'&&o.actionT>35&&o.actionT<300))return 0;
  const dk=o.dk,k=m.kind;let evade=false,punish=false;
  if(!body){if(dk===0){evade=k==='straight';punish=k==='hook';}else if(dk===1){evade=k==='straight'||k==='hook';punish=k==='upper';}else evade=true;}
  else if(dk===2)evade=true;
  if(evade){a.resolved=true;whiff(a,m);o.stats.slips++;
    if(o.actionT<170){o.counterWin=600;ev({ty:'pop',f:o.i,text:dk===0?'Slipped':dk===1?'Ducked':'Pulled back',cls:'slip',k:mk(a,'p')});}return 1;}
  return punish?2:0;}
function resolveFighter(a,o,ct,punished){
  a.resolved=true;const m=a.move;
  const body=ct.body,tp=body?simBody(o):simHead(o),hx=tp.x,hz=tp.z,rx=hx-a.x,rz=hz-a.z,c=dcos(a.yaw),s=dsin(a.yaw);
  const lz=rx*s+rz*c,gz=m.g[2];
  const ul=dhyp(o.x-a.x,o.z-a.z)||1,dx=(o.x-a.x)/ul,dz=(o.z-a.z)/ul;
  let mult=1,label=null,stunMul=1,guarded=false;
  if(punished){mult*=CTR;label='Counter';}
  // range: too close smothers the punch, the very tip of the reach only grazes
  const base=body?0.10:0.17;if(lz-gz<base-0.24||ct.smother){mult*=0.55;stunMul*=0.6;}else if(lz-gz>base+0.05){mult*=0.55;stunMul*=0.5;}
  // counters: after a perfect dodge or parry, or hitting a man while he throws (or taunts)
  if(label!=='Counter'){if(a.counterWin>0){mult*=CTR;a.counterWin=0;label='Counter';}
    else if(isAtk(o.action)&&!o.resolved){mult*=CTR;label='Counter';}
    else if(o.action==='taunt'&&!o.tauntSafe){mult*=CTR;label='Caught taunting';}}
  let dmg=m.dmg*mult;
  const ex=ct.x,ey=ct.y,ez=ct.z;
  if(ct.blk){
    const match=true;
    if(match&&o.actionT<=130&&o.parryOk!==false){ // parry: guard came up right on time
      a.action='hit';a.actionT=0;a.hitId++;a.stunMs=380;a.heavy=false;a.flash=0.5;react(a,CI.hitL,380);o.counterWin=650;o.stats.parries++;
      fx({x:ex,y:ey,z:ez,p:0.35,blk:true,parry:true,dx,dz,to:o.i,by:a.i,tr:0.06,kick:0,cr:0.05,k:mk(a,'b')});S.hitstop=Math.max(S.hitstop,70);S.hitTarget=a.i;
      ev({ty:'sfx',n:'block',k:mk(a,'B')});ev({ty:'pop',f:o.i,text:'Parry',cls:'slip',k:mk(a,'p')});return;}
    if(match){ // blocked: no damage. The guard quietly wears: 3 normal shots in a row or 1 power shot breaks it
      o.gw+=m.pow?GUARD_HITS:1;o.gwT=0;o.kx+=dx*0.9;o.kz+=dz*0.9;
      if(o.gw>=GUARD_HITS){o.gw=0;guardBreak(a,o,m,dx,dz,ex,ey,ez);return;}
      o.blockStun=90+m.dmg*8;blockReact(o,m,m.dmg);
      const e={x:ex,y:ey-0.12,z:ez,p:0.3,blk:true,dx,dz,to:o.i,by:a.i,tr:0.05,kick:0,cr:0,k:mk(a,'b')};fx(e);S.hitstop=Math.max(S.hitstop,40);S.hitTarget=o.i;
      ev({ty:'sfx',n:'block',k:mk(a,'B')});return;}
    // wrong guard (head guard against a body shot, or the other way round): it lands clean
  }
  land(a,o,m,dmg,label,dx,dz,ex,ey,ez,stunMul,!guarded&&stunMul===1);
}
/* guard break: the arms are knocked apart and he is wide open for a moment. The punch that breaks it does no damage, the next one lands clean */
function guardBreak(a,o,m,dx,dz,ex,ey,ez){
  o.action='hit';o.actionT=0;o.hitId++;o.blockStun=0;o.stunMs=GB_STUN;o.heavy=true;o.comboN=0;o.lowGuard=false;react(o,CI.bhH,GB_STUN);
  o.kx+=dx*1.2;o.kz+=dz*1.2;a.landed=true;
  fx({x:ex,y:ey-0.08,z:ez,p:0.7,blk:true,dx,dz,to:o.i,by:a.i,tr:0.3,kick:0.5,cr:0.2,k:mk(a,'b')});S.hitstop=Math.max(S.hitstop,90);S.hitTarget=o.i;
  ev({ty:'sfx',n:'block',k:mk(a,'B')});ev({ty:'pop',f:o.i,text:'Guard break',cls:'gb',k:mk(a,'p')});}
function blockReact(o,m,dmg){const heavy=dmg>=8.5,side=m.kind==='hook'?(m.hand==='R'?'L':'R'):'';
  o.bhc=CI[side?'b'+side+(heavy?'H':'L'):(heavy?'bhH':'bhN')];o.bhv=0;o.bhId=(o.bhId||0)+1;const sg=BSEG[o.bhc];o.bhd=Math.max(o.blockStun*1.6,(sg[2]-sg[0])/30*1000*0.6);}
function react(f,clip,stunMs){const sg=HSEG[clip];f.hc=clip;f.hv=0;f.hvd=Math.max(stunMs*1.25,(sg[2]-sg[0])/30*1000*0.8);}
function land(a,o,m,dmg,label,dx,dz,ex,ey,ez,stunMul,clean){
  const body=m.target==='body',wasStun=o.action==='hit',wasGassed=o.gassed;
  const n=wasStun?o.comboN+1:0;o.comboN=n;
  o.hp=Math.max(0,o.hp-dmg);a.rdmg+=dmg;          // head and body shots both take health
  if(m.drain)spend(o,m.drain);                       // body hooks also empty his tank
  o.ghostDelay=450;o.sinceHit=0;
  a.landed=true;a.stats.landed++;a.stats.dmg+=dmg;if(dmg>a.stats.best)a.stats.best=dmg;if(label==='Counter')a.stats.counters++;
  a.combo=wasStun?a.combo+1:1;
  o.action='hit';o.actionT=0;o.hitId++;o.blockStun=0;
  o.stunMs=m.stun*(label?1.15:1)*Math.max(0.45,1-0.16*n)*(stunMul||1);
  o.heavy=m.sev>0.6||!!label;o.hitSide=m.hand==='R'?1:-1;o.combo=0;
  // pick the reaction: right hand rocks the left side of the face, left hand the right side; uppercuts snap the chin up
  const med=dmg>=8.5||!!label,face=m.hand==='R'?'L':'R';
  react(o,body?(m.kind==='hook'&&m.hand==='R'?CI.kid:CI.sto):CI[(m.kind==='upper'?'u':'h')+face+(med?'M':'L')],o.stunMs);
  o.kx+=dx*m.kb;o.kz+=dz*m.kb;o.flash=1;
  const hs=o.hs,side=m.hand==='L'?1:-1;if(body){hs.vr+=1.2;}else if(m.kind==='hook'){hs.vx+=side*1.4;}else if(m.kind==='upper'){hs.vr-=4;}else{hs.vr-=2;}
  const p=clamp(dmg/16,0.25,1.35);
  S.hitstop=Math.max(S.hitstop,m.stop+(label?35:0));S.hitTarget=o.i;
  const e={x:ex,y:ey,z:ez,p,blk:false,dx,dz,to:o.i,by:a.i,tr:m.shake*(label?0.7:0.5),kick:p*0.75,cr:p*0.35,kind:m.kind,target:m.target,hand:m.hand,label,combo:a.combo,k:mk(a,'h')};fx(e);
  if(label==='Counter'&&p>0.55&&S.state==='fight'){S.scale=0.45;addT(160,'scale1');}
  if(label)ev({ty:'pop',f:o.i,text:label,cls:label==='Guard break'?'gb':'',k:mk(a,'p')});
  if(a.combo>=2)ev({ty:'pop',f:a.i,text:a.combo+' hit combo',cls:'combo',k:mk(a,'c')});
  if(o.hp<=0)knockdown(a,o,e,'Knockdown!');
  // the liver shot: a left hook to the body that lands on a man who has punched himself out
  else if(body&&m.kind==='hook'&&m.hand==='L'&&clean&&wasGassed&&S.state==='fight')liverShot(a,o);
}
/* The liver shot drops him to one knee for a few seconds. It is not a knockdown: no count, no health change, he gets up on his own */
const LIVER_MS=(CL[CI.liv].n-1)/0.03;
function liverShot(a,o){o.action='liver';o.actionT=0;o.hc=-1;o.comboN=0;o.kx*=0.3;o.kz*=0.3;
  ev({ty:'liver',by:a.i,to:o.i,k:'lv'+o.i+'.'+a.attackId+'.'+S.matchId});annEv('Liver shot!','small',1300,'lv'+a.attackId);}
/* Knockdowns: health at zero (or a liver shot on a gassed man) puts you down. Tap to beat the count. The second in a round is a TKO. */
function knockdown(a,o,e,why){
  if(S.state!=='fight'||prac()){return;}
  o.kd++;a.stats.kd++;
  const liver=why==='Liver shot!';
  if(o.kd>=2){S.koKind='T.K.O.';triggerKO(a,o,e,liver?CI.liv:0);return;}
  // the get-up animation follows how hard the shot was
  const m=a.move,sev=m&&m.pow?2:m&&(m.kind==='hook'||m.kind==='upper')?1:0;
  o.action='down';o.actionT=0;o.koClip=liver?CI.liv:CI.kdf;o.riseClip=liver?CI.liv:sev===0?CI.gL:sev===1?CI.gM:CI.gH;o.riseP=0;o.wob=0;o.hc=-1;o.gassed=false;
  const need=KD_TAPS;
  S.down={i:o.i,by:a.i,t:0,count:0,prog:0,need,up:false};setState('down');S.hitstop=Math.max(S.hitstop,140);S.scale=1;
  ev({ty:'kd',by:a.i,to:o.i,k:'d'+S.matchId+'.'+S.round+'.'+o.kd});annEv(why,'small',1300,'kd'+o.kd);}
function stepDown(dt){
  const D=S.down,o=S.F[D.i],a=S.F[1-D.i];D.t+=STEP;
  if(!D.up){const c=Math.floor((D.t-700)/900)+1;
    if(c>D.count&&c>=1){D.count=c;annEv(String(c),'count',700,'c'+o.kd+'.'+c);
      if(c>=10){S.koKind='K.O.';o.action='ko';o.actionT=99999;S.state='fight';triggerKO(a,o,{x:o.x,y:0.4,z:o.z});return;}}
    o.riseP+=(clamp(D.prog/D.need,0,1)-o.riseP)*(1-dexp(-dt*6));
    if(D.prog>=D.need&&D.count>=2&&o.actionT>=fallMs(o)){D.up=true;const fr=Math.max(0,downFrame(o,o.actionT));o.action='rise';o.actionT=0;
      const g=GETUP[o.riseClip];o.rise0=fr;o.riseMs=(CL[o.riseClip].n-1-fr)/(0.03*g.sp);}}
  else if(o.action==='rise'&&o.actionT>=o.riseMs){o.action='idle';o.actionT=0;o.hp=KD_HP;o.hpGhost=o.hp;o.stam=KD_ST;o.gassed=false;o.gw=0;o.gwT=0;o.wob=WOB_MS;
    if(a.action==='taunt'){a.action='idle';a.actionT=0;}
    S.down=null;setState('fight');annEv('Box!','fight',700,'bx'+o.kd);}
  // the man who scored it plays to the crowd while the count goes on
  if(!D.tt&&D.t>1100&&(a.action==='idle'||a.action==='walk')&&!D.up){D.tt=1;startTaunt(a,true);}
  // the standing fighter backs off to give room
  const dx=a.x-o.x,dz=a.z-o.z,d=dhyp(dx,dz)||1e-4;if(d<1.7){a.x+=dx/d*0.9*dt;a.z+=dz/d*0.9*dt;clampRing(a);}
}
function stepFighter(f,dt){
  const ms=dt*1000,pr=prac(),o=pr?null:S.F[1-f.i];f.actionT+=ms;
  f.slipCd=Math.max(0,f.slipCd-ms);f.counterWin=Math.max(0,f.counterWin-ms);f.flash=Math.max(0,f.flash-dt*9);f.blockStun=Math.max(0,f.blockStun-ms);
  f.wob=Math.max(0,f.wob-ms);f.dheat=Math.max(0,f.dheat-dt*0.8);f.sinceHit+=ms;f.guardHit+=ms;f.hv+=ms;f.bhv+=ms;f.tauntCd=Math.max(0,f.tauntCd-ms);
  f.gwT+=ms;if(f.gw>0&&f.gwT>=GUARD_HEAL){f.gw--;f.gwT=0;}
  if(f.action==='taunt'&&f.actionT>=f.tauntMs){f.action='idle';f.actionT=0;
    if(!f.tauntSafe){f.stam=Math.min(ST0,f.stam+10);ev({ty:'tauntDone',f:f.i,k:'td'+f.i+'.'+S.matchId+'.'+f.tauntN+'.'+Math.round(nowMs()/100)});}}
  const hs=f.hs;hs.vx+=(-230*hs.x-14*hs.vx)*dt;hs.x=clamp(hs.x+hs.vx*dt,-0.12,0.12);hs.vr+=(-260*hs.r-15*hs.vr)*dt;hs.r=clamp(hs.r+hs.vr*dt,-0.6,0.6);
  if(f.hpGhost>f.hp){if(f.ghostDelay>0)f.ghostDelay-=ms;else f.hpGhost=Math.max(f.hp,f.hpGhost-dt*45);}else f.hpGhost=f.hp;
  // stamina: punching spends it, half a second after your last punch it refills fast (half speed behind the guard)
  const a0=f.action;
  if(!isAtk(a0)&&!grounded(a0)&&nowMs()-f.lastPunch>=ST_DELAY)f.stam=Math.min(ST0,f.stam+ST_RATE*(a0==='block'?ST_BLOCK:1)*dt);
  if(f.gassed&&f.stam>=GAS_UNLOCK)f.gassed=false;
  const inp=f.inp;if(inp.buf&&nowMs()-inp.buf.t>180)inp.buf=null;
  if(isAtk(a0)){const m=f.move;
    if(!f.swish&&f.actionT>=f.su*m.ext){f.swish=true;ev({ty:'sfx',n:'swish',a:m.sev,k:mk(f,'w')});}
    if(pr){if(!f.resolved&&f.actionT>=f.su*0.3){const ct=bagContact(f);
        if(ct){f.cut=ct.cut;f.cutT=f.actionT;resolveBag(f,ct);}else if(f.actionT>=f.su+m.active)resolveBag(f,null);}}
    else if(!f.resolved&&f.actionT>=f.su*0.7){
      if(grounded(o.action)){if(f.actionT>=f.su)f.resolved=true;}
      else{if(f.actionT>=f.su&&f.dodgeId!==f.attackId){f.dodgeId=f.attackId;f.dodge=dodgeCheck(f,o);}
        if(!f.resolved){const ct=contact(f,o);
          if(ct){f.cut=f.vis.t1;f.cutT=f.actionT;resolveFighter(f,o,ct,f.dodge===2);}
          else if(f.actionT>=f.su+m.active){f.resolved=true;whiff(f,m);}}}}
    if(f.action===a0&&f.actionT>=f.su+m.active+f.rc){f.action='idle';f.actionT=0;}
  }else if(a0==='slip'){if(f.actionT>=SLIP_MS){f.action='idle';f.actionT=0;}}
  else if(a0==='hit'){if(f.actionT>=f.stunMs){f.action='idle';f.actionT=0;f.comboN=0;}}
  else if(a0==='liver'&&f.actionT>=LIVER_MS){f.action='idle';f.actionT=0;f.stam=Math.max(f.stam,GAS_UNLOCK);f.gassed=false;f.lastPunch=-1e9;}
  if(!grounded(f.action)&&f.action!=='win')decide(f);
  const r=relAxes(f),act=f.action,fv=stepFeet(f,dt);
  if(footFree(f)){f.vx=fv[0];f.vz=fv[1];}
  else if(act==='slip'){if(f.dk===2&&f.actionT<200){const sp=1.4*(1-f.actionT/200);f.vx=-r.ux*sp;f.vz=-r.uz*sp;}else{const k=dexp(-dt*40);f.vx*=k;f.vz*=k;}}
  else{const k=dexp(-dt*30);f.vx*=k;f.vz*=k;}
  if(isAtk(act)&&f.actionT<f.su&&(pr||!grounded(o.action))){const delta=r.d-(pr?f.move.g[2]+BAG_R+0.045:f.move.ideal);
    if(delta>-0.4&&delta<0.3){const st=clamp(delta,-1.6*dt,1.3*dt);f.x+=r.ux*st;f.z+=r.uz*st;}}
  f.x+=(f.vx+f.kx)*dt;f.z+=(f.vz+f.kz)*dt;
  const kk=dexp(-dt*9);f.kx*=kk;f.kz*=kk;
  const t=tgt(f);
  if(fv[2]){const nx=f.x-t.x,nz=f.z-t.z,nd=dhyp(nx,nz)||1e-4;f.x=t.x+nx/nd*r.d;f.z=t.z+nz/nd*r.d;}
  if(!grounded(act)){
    let tx=t.x,tz=t.z,rate=14;const aiming=isAtk(act)&&f.actionT<f.su+f.move.active;
    if(aiming){if(!pr){const h=f.move.target==='body'?simBody(o):simHead(o);tx=h.x;tz=h.z;}rate=30;}
    let ty=datan2(tx-f.x,tz-f.z);if(aiming)ty-=datan2(f.move.g[0],f.move.g[2]);
    f.yaw=wrapA(f.yaw+wrapA(ty-f.yaw)*(1-dexp(-dt*rate)));
  }
}
function clampRing(f){const x=clamp(f.x,-BOUND,BOUND),z=clamp(f.z,-BOUND,BOUND);const hit=x!==f.x||z!==f.z;f.x=x;f.z=z;return hit;}
function spacing(){
  const a=S.F[0],b=S.F[1];if(grounded(a.action)||grounded(b.action)){clampRing(a);clampRing(b);return;}
  let dx=b.x-a.x,dz=b.z-a.z,d=dhyp(dx,dz)||1e-4;
  if(d<MIN_D){const push=(MIN_D-d)/2,ux=dx/d,uz=dz/d;a.x-=ux*push;a.z-=uz*push;b.x+=ux*push;b.z+=uz*push;}
  const ah=clampRing(a),bh=clampRing(b);dx=b.x-a.x;dz=b.z-a.z;d=dhyp(dx,dz)||1e-4;
  if(d<MIN_D-0.005){const ux=dx/d,uz=dz/d;if(ah&&!bh){b.x=a.x+ux*MIN_D;b.z=a.z+uz*MIN_D;clampRing(b);}else{a.x=b.x-ux*MIN_D;a.z=b.z-uz*MIN_D;clampRing(a);}}
}
