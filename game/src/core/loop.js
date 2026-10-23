/* South Paw · src/core/loop.js
   The frame loop: runs the sim at 120 Hz, then draws, plays sound and updates the HUD.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= LOOP ================= */
const VA=blankVis(),VB=blankVis(),VBAG={tx:0,tz:0,bob:0,flash:0};
const LIN_KEYS=['aw','fw','sw','sl','sd','dl','hx','hr','flash','gsL','gsR','trL','trR'];
function lerpVis(out,a,b,t){
  out.x=a.x+(b.x-a.x)*t;out.z=a.z+(b.z-a.z)*t;out.yaw=a.yaw+wrapA(b.yaw-a.yaw)*t;
  for(const k of LIN_KEYS)out[k]=a[k]+(b[k]-a[k])*t;
  {const d=b.it-a.it;out.it=Math.abs(d)>4?b.it:a.it+d*t;}
  for(const [c,tk] of [['fc','ft'],['fc0','ft0'],['sc','st'],['sc0','st0']]){out[c]=b[c];const d=b[tk]-a[tk];out[tk]=(a[c]===b[c]&&Math.abs(d)<6)?a[tk]+d*t:b[tk];}
  out.a0=b.a0;out.a1=b.a1;out.ev=b.ev;
  const fsame=a.fc===b.fc&&a.fc0===b.fc0,ssame=a.sc===b.sc&&a.sc0===b.sc0,asame=a.a0===b.a0&&a.a1===b.a1&&a.ev===b.ev;
  out.fx=fsame&&b.fx>=a.fx?a.fx+(b.fx-a.fx)*t:b.fx;out.sx=ssame&&b.sx>=a.sx?a.sx+(b.sx-a.sx)*t:b.sx;
  out.bw=asame&&b.bw>=a.bw?a.bw+(b.bw-a.bw)*t:b.bw;out.low=asame?a.low+(b.low-a.low)*t:b.low;
  out.t0=(a.a0===b.a0&&Math.abs(b.t0-a.t0)<6)?a.t0+(b.t0-a.t0)*t:b.t0;
  out.t1=(a.a1===b.a1&&Math.abs(b.t1-a.t1)<6)?a.t1+(b.t1-a.t1)*t:b.t1;
  return out;}
function lerpBag(out,a,b,t){out.tx=a.tx+(b.tx-a.tx)*t;out.tz=a.tz+(b.tz-a.tz)*t;out.bob=a.bob+(b.bob-a.bob)*t;out.flash=b.flash;return out;}
let last=performance.now(),acc=0,lastAtkT=0,lastBoo=0;const BAGV={x:0,z:0};let rpLast=-1;
function frame(now){
  requestAnimationFrame(frame);
  let dt=now-last;last=now;if(dt>100)dt=100;if(dt<0)dt=0;realT+=dt;fitCheck();adaptRes(dt);showUpdate(G.paused?0:dt);
  const online=S.mode==='online';
  if(online){netFrame(dt);tickTimers(dt);}
  else if(!G.paused){tickTimers(dt);acc+=dt;let n=0;while(acc>=STEP&&n<12){step([S.show?showInput():(S.mode==='attract'||S.F[0].ai?null:sampleLocal()),null]);acc-=STEP;n++;}if(n>=12)acc=0;}
  if(!S)return;
  drainEvents();syncUI();
  renderDt=G.paused?0:dt*(S.state==='replay'?1:(S.hitstop>0?0.15:S.scale*S.userScale));
  const pr=prac();const Lc=LOC(),Rc=1-Lc;let va,vb,vg;
  if(S.state==='replay'&&S.rp){const rp=S.rp,i=Math.floor(rp.pos),t=rp.pos-i,f0=rec[i%REC],f1=rec[Math.min(i+1,rp.end)%REC];
    va=lerpVis(VA,f0.a,f1.a,t);vb=lerpVis(VB,f0.b,f1.b,t);vg=lerpBag(VBAG,f0.g,f1.g,t);
    if(rpLast<rp.start||rpLast>i)rpLast=rp.start;for(let k=rpLast+1;k<=i;k++)rec[k%REC].ev.forEach(e=>spawnFx(e,false));rpLast=i;}
  else{rpLast=-1;const al=S.hitstop>0?1:clamp((online?NET.acc:acc)/STEP,0,1);va=lerpVis(VA,S.F[0].prev,S.F[0].vis,al);vb=lerpVis(VB,S.F[1].prev,S.F[1].vis,al);
    vg=lerpBag(VBAG,S.bagPrev,S.bag,al);
    if(S.hitstop>0){if(pr){vg.tx+=(Math.random()-.5)*0.01;vg.tz+=(Math.random()-.5)*0.01;}
      else if(S.hitTarget>=0){const v=S.hitTarget?vb:va;v.x+=(Math.random()-.5)*0.03;v.z+=(Math.random()-.5)*0.03;}}}
  applyVis(B[0],va);showPose(B[0]);if(!pr)applyVis(B[1],vb);applyBag(vg);
  const fxScale=G.paused?0:S.state==='replay'?(S.rp&&S.rp.kind==='prac'?0.4:1):S.hitstop>0?0.08:S.scale*S.userScale;
  updateFx(dt/1000*fxScale);
  const vL=Lc===0?va:vb,vR=Lc===0?vb:va;
  if(S.show)showCamera(dt,va);
  else if(pr){const c=bagCenter(vg);BAGV.x=c[0];BAGV.z=c[1];updateCamera(dt,va,BAGV);}else updateCamera(dt,vL,vR);
  B[0].root.updateMatrixWorld(true);if(!pr)B[1].root.updateMatrixWorld(true);
  const adv=fxScale>0.15;
  updateTrail(trails[0][0],B[0].gloves[0],va.trL,adv);updateTrail(trails[0][1],B[0].gloves[1],va.trR,adv);
  if(!pr){updateTrail(trails[1][0],B[1].gloves[0],vb.trL,adv);updateTrail(trails[1][1],B[1].gloves[1],vb.trR,adv);}
  if(!G.paused){crowdExcite=Math.max(0.06,crowdExcite-dt/1000*0.22);crowdFlashes(dt/1000);}
  {const me=S.F[LOC()],live=S.mode!=='attract'&&!pr&&(S.state==='fight'||S.state==='down'),danger=live?Math.max(clamp((32-me.hp)/32,0,1),me.wob>0?0.7:0,S.state==='down'&&S.down&&S.down.i===LOC()?0.85:0):0;
    Sfx.update(dt/1000,crowdExcite*(pr?0.6:1),danger,S.state);
    if(S.mode==='cpu'||S.mode==='online'){if(S.state!=='fight')lastAtkT=realT;else if(realT-lastAtkT>9000&&realT-lastBoo>9000){lastBoo=realT;Sfx.react('boo',0.7);crowdExcite=Math.max(0.06,crowdExcite-0.2);}}}updateRingFade(dt);updateCrowd();updateHUD();
  renderer.render(scene,camera);
}
