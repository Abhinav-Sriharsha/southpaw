/* South Paw · src/ui/titleShow.js
   The film behind the title screen: a pre-fight training montage in the empty arena, cut like a film trailer.
   He wraps his hands on a bench, stands, stretches, warms up, skips rope, squats, drops into push-ups, works the speed bag,
   and finishes on the heavy bag. Then it fades out and loops.
   - SEGS is the running order. Each segment plays a Mixamo clip at a "station" (a spot in the ring), or for the heavy bag
     ('bag') hands over to the real practice sim, so those punches and the bag are exactly the game's.
   - The hand wrapping has no clip: it is the first frame of Sit_To_Stand with the arms posed in code (wrapArms).
   - Props built here: the bench, the skipping rope (redrawn every frame between his hands, in time with his jumps),
     the speed bag on its stand, and the wraps on his hands (the gloves are hidden during the film).
   - Each segment has its own shot (SEGS[i].cam): camera and target in the station's own frame, with a slow push,
     turned so he sits on the right of the screen and the title has the left.
   - It runs while the sim is in 'attract' mode with S.show set (startAttract in screens.js). prac() treats it like practice.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ---- where things happen (metres, ring centre = heavy bag), and which way he faces ---- */
const STN={
  bench:{x:-2.55,z:-2.35,yaw:0.62},
  stretch:{x:-1.4,z:2.3,yaw:2.3},
  warm:{x:1.2,z:2.45,yaw:-2.6},
  rope:{x:2.4,z:-1.9,yaw:-0.9},
  floor:{x:2.15,z:0.9,yaw:-1.7},
  sbag:{x:-2.65,z:0.6,yaw:-1.57},
  heavy:{x:-0.9,z:-0.15,yaw:Math.atan2(0.9,0.15)}};
/* ---- the running order. d: seconds. c: clip. loop: repeat the clip. from: start frame. cont: same shot carries on (no dip).
   cam: {a: angle round him in degrees (0 = in front, -90 = his right side), r: distance [start, end] (a slow push or pull),
         h: camera height [start, end], y: height looked at, fov, x0: how far right he sits on screen (0 middle, 1 edge)} ---- */
const SEGS=[
  {k:'wrap',st:'bench',d:8.5,cam:{a:-38,r:[3.1,2.55],h:[1.05,0.95],y:0.78,fov:30,x0:0.42}},
  {k:'clip',c:'s2s',st:'bench',d:2.6,cont:true,cam:{a:-38,r:[2.55,3.2],h:[0.95,1.25],y:0.95,fov:30,x0:0.42}},
  {k:'clip',c:'neck',st:'stretch',d:3.2,cam:{a:28,r:[2.1,1.95],h:[1.58,1.56],y:1.48,fov:27,x0:0.42}},
  {k:'clip',c:'arms',st:'stretch',d:5.2,from:40,cam:{a:-78,r:[3.6,3.25],h:[1.3,1.25],y:1.15,fov:30,x0:0.44}},
  {k:'clip',c:'warm',st:'warm',d:6.2,from:20,cam:{a:-28,r:[4.4,4.0],h:[0.55,0.62],y:1.0,fov:32,x0:0.42}},
  {k:'clip',c:'rope',st:'rope',d:7.7,loop:true,cam:{a:-38,r:[4.4,4.0],h:[0.4,0.45],y:0.98,fov:31,x0:0.42}},
  {k:'clip',c:'squat',st:'floor',d:5.6,loop:true,cam:{a:36,r:[3.6,3.3],h:[0.8,0.78],y:0.8,fov:31,x0:0.42}},
  {k:'clip',c:'i2p',st:'floor',d:2.6,cam:{a:-90,r:[3.3,3.2],h:[0.3,0.3],y:0.45,fov:30,x0:0.4}},
  {k:'clip',c:'push',st:'floor',d:4.6,loop:true,cont:true,cam:{a:-90,r:[3.2,2.85],h:[0.3,0.28],y:0.36,fov:30,x0:0.4}},
  {k:'clip',c:'sbag',st:'sbag',d:8.6,loop:true,cam:{a:-62,r:[2.9,2.6],h:[1.5,1.48],y:1.48,fov:30,x0:0.42}},
  {k:'bag',st:'heavy',d:7,cam:{a:-90,r:[3.7,3.4],h:[1.3,1.28],y:1.2,fov:32,x0:0.3,mid:0.4}},
  {k:'bag',st:'heavy',d:6.5,cont:true,cam:{a:-35,r:[2.9,2.6],h:[0.92,0.96],y:1.32,fov:32,x0:0.38}}];
let SHOW_LEN=0;for(const s of SEGS){s.t0=SHOW_LEN;SHOW_LEN+=s.d;}
const SHOW={t:0,seg:-1,lastAtk:-1,q:[],wait:0,ci:0,since:0,cam:new V3(),look:new V3()};
const SHOW_COMBOS=[[1,1,7],[1,7,2],[5,11,6],[1,7,8],[1,2,7],[3,9,2],[1,1,7,2],[11,6,2]];

/* ---- props ---- */
const showWhite=toon(0xf3f0e7),showWood=toon(0x5a3a22),showMetal=toon(0x2c2f37),showLeather=toon(0x8e1d18);
const showBench=(function(){const g=new THREE.Group();
  const top=part(new THREE.BoxGeometry(1.25,0.07,0.36),showWood);top.position.y=0.415;g.add(top);
  for(const x of [-0.5,0.5]){const leg=part(new THREE.BoxGeometry(0.06,0.38,0.3),showMetal);leg.position.set(x,0.19,0);g.add(leg);}
  const towel=part(new THREE.BoxGeometry(0.34,0.025,0.3),toon(0xe9e3d3));towel.position.set(-0.36,0.462,0.01);towel.rotation.y=0.12;g.add(towel);
  scene.add(g);g.visible=false;return g;})();
const showSBag=(function(){const g=new THREE.Group();   // a freestanding speed bag: pole, platform, swivel, bag
  const pole=part(new THREE.CylinderGeometry(0.035,0.035,2.1,14),showMetal);pole.position.set(0,1.05,-0.32);g.add(pole);
  const foot=part(new THREE.CylinderGeometry(0.3,0.32,0.04,24),showMetal);foot.position.set(0,0.02,-0.32);g.add(foot);
  const arm=part(new THREE.BoxGeometry(0.06,0.05,0.34),showMetal);arm.position.set(0,1.99,-0.16);g.add(arm);
  const board=part(new THREE.CylinderGeometry(0.33,0.33,0.06,32),showWood);board.position.set(0,2.0,0.02);g.add(board);
  const pivot=new THREE.Group();pivot.position.set(0,1.965,0.02);g.add(pivot);
  const bag=part(new THREE.SphereGeometry(1,24,18),showLeather);bag.scale.set(0.075,0.12,0.075);bag.position.y=-0.15;pivot.add(bag);
  const neck=part(new THREE.CylinderGeometry(0.02,0.035,0.06,12),showLeather);neck.position.y=-0.03;pivot.add(neck);
  scene.add(g);g.visible=false;return {g,pivot,placed:false};})();
const showRope=new THREE.Mesh(new THREE.BufferGeometry(),toon(0x17181d));showRope.visible=false;scene.add(showRope);
const showStrip=new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,1,6).translate(0,0.5,0),showWhite);showStrip.visible=false;scene.add(showStrip);
/* bare fists and wraps on our boxer's hands */
const showHands=['Left','Right'].map(side=>{const h=B[0].bones[BIDX[side+'Hand']],skin=toon(CORNERS[0].skin);
  const fist=ell(h,skin,4.4,5.5,4.7,0,6.6,1);const cover=ell(h,showWhite,4.75,5.85,5.05,0,6.6,1);
  const band=part(new THREE.CylinderGeometry(4.7,4.9,8,22).translate(0,0.5,0),showWhite);band.position.set(0,-2.5,0.3);h.add(band);
  const roll=part(new THREE.CylinderGeometry(2.6,2.6,4.4,18),showWhite);roll.rotation.z=Math.PI/2;roll.position.set(0,6.5,6.5);h.add(roll);
  [fist,cover,band,roll].forEach(m=>m.visible=false);return {fist,cover,band,roll};});
/* lights: a warm key that follows him, a cool rim from behind, the arena dimmed */
const showKey=new THREE.SpotLight(0xffd2a0,0,14,0.55,0.7,1.1);scene.add(showKey,showKey.target);
const showRim=new THREE.DirectionalLight(0x7fa6ff,0);scene.add(showRim,showRim.target);
const showHemi=scene.children.find(o=>o.isHemisphereLight);
let showWasOn=false;const showFog={near:scene.fog?scene.fog.near:12,far:scene.fog?scene.fog.far:30};

function showSetup(on){
  if(on===showWasOn)return;showWasOn=on;
  crowd.bodies.visible=!on;crowd.heads.visible=!on;showBench.visible=on;showSBag.g.visible=on;
  B[0].gloves.forEach(g=>g.visible=!on);showHands.forEach(h=>{h.fist.visible=on;});
  if(!on){showHands.forEach(h=>{h.cover.visible=h.band.visible=h.roll.visible=false;});showStrip.visible=false;showRope.visible=false;}
  showKey.intensity=on?2.4:0;showRim.intensity=on?0.95:0;spot.intensity=on?0.32:1.35;if(showHemi)showHemi.intensity=on?0.16:0.4;
  rimR.intensity=rimB.intensity=on?0.25:0.45;
  if(scene.fog){scene.fog.near=on?4.5:showFog.near;scene.fog.far=on?15:showFog.far;}
  document.body.classList.toggle('filming',on);}
function showReset(){SHOW.t=0;SHOW.seg=-1;SHOW.q=[];SHOW.wait=900;SHOW.lastAtk=-1;SHOW.since=0;
  const f=S.F[0],h=STN.heavy;Object.assign(f,{x:h.x,z:h.z,vx:0,vz:0,kx:0,kz:0,action:'idle',actionT:0});f.yaw=h.yaw;
  Object.assign(S.bag,{x:0,z:0,tx:0,tz:0,wx:0,wz:0,bob:0,bobV:0,flash:0});}
function showSegAt(t){for(let i=SEGS.length-1;i>=0;i--)if(t>=SEGS[i].t0)return i;return 0;}
function showUpdate(dt){
  const on=!!(S&&S.show);showSetup(on);if(!on)return;
  SHOW.t+=dt/1000;if(SHOW.t>=SHOW_LEN)showReset();
  const t=SHOW.t,i=showSegAt(t),sg=SEGS[i],u=t-sg.t0;
  if(i!==SHOW.seg&&sg.k==='bag'&&!sg.cont){const f=S.F[0],h=STN.heavy;Object.assign(f,{x:h.x,z:h.z,vx:0,vz:0,action:'idle',actionT:0});f.yaw=h.yaw;}
  // fades: in at the start, out at the end, and a quick dip at each change of place
  let fade=Math.max(1-smooth(0,1.0,t),smooth(SHOW_LEN-1.2,SHOW_LEN-0.1,t));
  if(!sg.cont&&i>0)fade=Math.max(fade,1-smooth(0,0.22,u));
  const nx=SEGS[i+1];if(nx&&!nx.cont)fade=Math.max(fade,smooth(sg.d-0.18,sg.d,u));
  const el=$('#showFade');if(el)el.style.opacity=fade.toFixed(3);}
function showWraps(t){return {L:smooth(0.6,4.2,t),R:smooth(4.4,8.0,t),active:t<4.3?0:t<8.1?1:-1};}

/* ---- inputs for the sim: stand at the heavy bag, then throw the combos ---- */
function showInput(){
  const f=S.F[0],t=SHOW.t,sg=SEGS[showSegAt(t)];
  if(sg.k!=='bag'){const h=STN.heavy;f.x=h.x;f.z=h.z;f.vx=f.vz=f.kx=f.kz=0;f.yaw=h.yaw;return 5;}
  const d=Math.hypot(S.bag.x-f.x,S.bag.z-f.z),fw=d>0.95?1:d<0.72?-1:0;let act=0;
  if(t<SHOW_LEN-1.0){
    if(!SHOW.q.length){SHOW.wait-=STEP;if(SHOW.wait<=0){SHOW.q=SHOW_COMBOS[SHOW.ci++%SHOW_COMBOS.length].slice();SHOW.wait=550+((SHOW.ci*397)%550);SHOW.lastAtk=-1;}}
    // one punch at a time: the next once the last has started (or never started) and he can throw again
    SHOW.since+=STEP;const free=canAct(f);
    if(SHOW.q.length&&(free===true||free==='cancel')&&(SHOW.lastAtk<0||f.attackId>SHOW.lastAtk||SHOW.since>700)){act=SHOW.q.shift();SHOW.lastAtk=f.attackId;SHOW.since=0;}}
  return (fw+1)|(1<<2)|(act<<5);}

/* ---- posing ---- */
const SPO=mkPose(),shQ=[],shT=new THREE.Quaternion(),shA=new V3(),shF=new V3(),shU=new V3(0,1,0),shP=new V3(),shC=new V3(),shHs=new V3(),shH0=new V3();
const shHQ=[new THREE.Quaternion(),new THREE.Quaternion()],shR=new THREE.Quaternion();
const shQ2=[];for(let i=0;i<NB;i++){shQ.push(new THREE.Quaternion());shQ2.push(new THREE.Quaternion());}
function stnFrame(st){const s=STN[st];return {x:s.x,z:s.z,yaw:s.yaw,fx:Math.sin(s.yaw),fz:Math.cos(s.yaw),lx:Math.cos(s.yaw),lz:-Math.sin(s.yaw)};}
function clipFrame(sg,u){const n=CL[CI[sg.c]].n,fr=(sg.from||0)+u*30;return sg.loop?fr%(n-1):Math.min(fr,n-1);}
function poseClip(b,ci,fr,st){sampleClip(ci,fr,SPO);for(let i=0;i<NB;i++)b.bones[i].quaternion.fromArray(SPO.q,i*4);
  b.hips.position.set(SPO.hp[0],SPO.hp[1],SPO.hp[2]);const s=STN[st];b.root.position.set(s.x,0,s.z);b.root.rotation.y=s.yaw;b.root.updateMatrixWorld(true);}
/* one hand held out in front, the other circling its wrist with the roll of wrap. k: how much of this to apply */
function wrapArms(b,t,k){
  const bn=n=>b.bones[BIDX[n]];
  for(let i=0;i<NB;i++)shQ[i].copy(b.bones[i].quaternion);
  shA.set(1,0,0).applyQuaternion(b.root.quaternion);shF.set(0,0,1).applyQuaternion(b.root.quaternion);
  const br=Math.sin(t*1.7)*0.02;
  rotBoneWorld(bn('Spine1'),shR.setFromAxisAngle(shA,0.12+br));rotBoneWorld(bn('Neck'),shR.setFromAxisAngle(shA,0.3));rotBoneWorld(bn('Head'),shR.setFromAxisAngle(shA,0.18));
  const w=showWraps(t),wl=w.active===1?1:0,arms=['Left','Right'].map(s=>[bn(s+'Arm'),bn(s+'ForeArm'),bn(s+'Hand')]);
  arms.forEach((A,i)=>A[2].getWorldQuaternion(shHQ[i]));
  bn('Spine2').getWorldPosition(shP);
  const ws=wl===0?1:-1,ang=t*Math.PI*2*1.15;
  const held=shC.copy(shP).addScaledVector(shF,0.36).addScaledVector(shU,-0.12).addScaledVector(shA,0.06*ws);
  legIK(arms[wl][0],arms[wl][1],arms[wl][2],held,shHQ[wl]);
  arms[wl][2].getWorldPosition(shHs);
  const circ=shP.copy(shHs).addScaledVector(shF,-0.03).addScaledVector(shA,-ws*(0.05+Math.cos(ang)*0.06)).addScaledVector(shU,Math.sin(ang)*0.06+0.02);
  legIK(arms[1-wl][0],arms[1-wl][1],arms[1-wl][2],circ,shHQ[1-wl]);
  if(k<1)for(let i=0;i<NB;i++){shT.copy(b.bones[i].quaternion);b.bones[i].quaternion.copy(shQ[i]).slerp(shT,k);}
  b.root.updateMatrixWorld(true);}
/* the skipping rope: a loop from hand to hand, swung round in time with his jumps (worked out from the clip once) */
let ropeSync=null;const ropePts=[];for(let i=0;i<=24;i++)ropePts.push(new V3());const ropeCurve=new THREE.CatmullRomCurve3(ropePts);
function ropeTiming(){if(ropeSync)return ropeSync;const C=CL[CI.rope],ys=[];for(let f=0;f<C.n;f++)ys.push(C.hp[f*3+1]);
  const peaks=[];for(let f=2;f<C.n-2;f++)if(ys[f]>=ys[f-1]&&ys[f]>=ys[f+1]&&ys[f]>=ys[f-2]&&ys[f]>=ys[f+2]&&ys[f]>Math.min(...ys)+4)peaks.push(f);
  const J=Math.max(1,peaks.length),f1=peaks.length?peaks[0]:0;ropeSync={J,f1,n:C.n-1};return ropeSync;}
function drawRope(b,fr){const R=ropeTiming(),phi=Math.PI+2*Math.PI*R.J*(fr-R.f1)/R.n;
  const hl=b.bones[BIDX.LeftHand],hr=b.bones[BIDX.RightHand];hl.getWorldPosition(shP);hr.getWorldPosition(shC);
  shF.set(0,0,1).applyQuaternion(b.root.quaternion);
  const mid=shHs.copy(shP).add(shC).multiplyScalar(0.5),r=Math.max(0.5,mid.y-0.03);
  const dx=-Math.sin(phi),dy=-Math.cos(phi);   // phi 0 = under the feet, pi = over the head, swinging forward over the top
  for(let i=0;i<=24;i++){const s=i/24,bulge=Math.pow(Math.sin(Math.PI*s),0.6);
    ropePts[i].lerpVectors(shP,shC,s).addScaledVector(shF,dx*r*bulge).addScaledVector(shU,dy*r*bulge);}
  showRope.geometry.dispose();showRope.geometry=new THREE.TubeGeometry(ropeCurve,40,0.009,5,false);showRope.visible=true;}
/* the speed bag: placed once in front of his hands, then flutters while he works it */
function placeSBag(b){const s=STN.sbag,C=CL[CI.sbag];const acc=new V3();let n=0;
  for(let f=0;f<C.n;f+=6){poseClip(b,CI.sbag,f,'sbag');b.bones[BIDX.LeftHand].getWorldPosition(shP);b.bones[BIDX.RightHand].getWorldPosition(shC);acc.add(shP).add(shC);n+=2;}
  acc.multiplyScalar(1/n);showSBag.g.position.set(acc.x+Math.sin(s.yaw)*0.16,acc.y+0.3-1.965,acc.z+Math.cos(s.yaw)*0.16);
  showSBag.g.rotation.y=s.yaw+Math.PI;showSBag.placed=true;}
function showPose(b){
  if(!S.show)return;const t=SHOW.t,i=showSegAt(t),sg=SEGS[i],u=t-sg.t0;
  if(!showSBag.placed)placeSBag(b);
  // the bench sits under him where Sit_To_Stand starts
  if(!showBench.userData.placed){poseClip(b,CI.s2s,0,'bench');b.hips.getWorldPosition(shP);const s=STN.bench;
    showBench.position.set(shP.x-Math.sin(s.yaw)*0.07,0,shP.z-Math.cos(s.yaw)*0.07);showBench.rotation.y=s.yaw;showBench.userData.placed=true;}
  let wr={L:1,R:1,active:-1};
  if(sg.k==='wrap'){poseClip(b,CI.s2s,0,'bench');wrapArms(b,u,1);wr=showWraps(u);}
  else if(sg.k==='clip'){const fr=clipFrame(sg,u);poseClip(b,CI[sg.c],fr,sg.st);
    if(sg.c==='s2s'&&u<0.5){   // the arms come off the wrapping pose into the clip over half a second
      for(let k=0;k<NB;k++)shQ2[k].copy(b.bones[k].quaternion);
      poseClip(b,CI.s2s,0,'bench');wrapArms(b,8.5,1);
      const w=smooth(0,0.5,u);for(let k=0;k<NB;k++)b.bones[k].quaternion.slerp(shQ2[k],w);
      sampleClip(CI.s2s,fr,SPO);b.hips.position.set(SPO.hp[0],SPO.hp[1],SPO.hp[2]);b.root.updateMatrixWorld(true);}}
  if(sg.k==='clip'&&sg.c==='rope')drawRope(b,clipFrame(sg,u));else showRope.visible=false;
  // speed bag flutter, still otherwise
  const sb=sg.k==='clip'&&sg.c==='sbag'?1:0,tt=SHOW.t;
  showSBag.pivot.rotation.x=sb*(0.55*Math.sin(tt*2*Math.PI*6.3)+0.2*Math.sin(tt*2*Math.PI*12.6+1.1))*smooth(0,0.4,u);
  showSBag.pivot.rotation.z=sb*0.12*Math.sin(tt*2*Math.PI*3.1);
  // wraps and the strip of wrap between the hands
  const amt=[wr.L,wr.R];
  showHands.forEach((h,k)=>{const a=amt[k];h.band.visible=a>0.02;h.band.scale.y=Math.max(0.05,smooth(0,0.6,a));h.cover.visible=a>0.55;
    const c=0.9+0.1*smooth(0.55,1,a);h.cover.scale.set(4.75*c,5.85*c,5.05*c);h.roll.visible=wr.active===1-k;h.roll.scale.setScalar(1-0.45*amt[1-k]);});
  if(wr.active>=0){const holder=showHands[1-wr.active].roll,dst=b.bones[BIDX[(wr.active===0?'Left':'Right')+'Hand']];
    holder.getWorldPosition(shP);dst.getWorldPosition(shC);shC.sub(shP);const len=shC.length();
    showStrip.visible=true;showStrip.position.copy(shP);showStrip.scale.set(1,len,1);showStrip.quaternion.setFromUnitVectors(shU,shC.normalize());}
  else showStrip.visible=false;
  // the key light follows him; the rim light sits behind him from the camera
  b.hips.getWorldPosition(shP);showKey.position.set(shP.x+(camera.position.x-shP.x)*0.35,4.2,shP.z+(camera.position.z-shP.z)*0.35);showKey.target.position.copy(shP);
  showRim.position.set(shP.x-(camera.position.x-shP.x)*2,3.2,shP.z-(camera.position.z-shP.z)*2);showRim.target.position.copy(shP);}

/* ---- the camera: one shot per segment, a slow push, a little hand-held drift, always on him ---- */
const shCamT=new V3(),shLookT=new V3(),shHip=new V3();
function showCamera(dt,v){
  const t=SHOW.t,i=showSegAt(t),sg=SEGS[i],u=smooth(0,sg.d,t-sg.t0),C=sg.cam;
  let o;if(sg.k==='bag'){const dx=S.bag.x-v.x,dz=S.bag.z-v.z,dl=Math.hypot(dx,dz)||1;o={x:v.x,z:v.z,fx:dx/dl,fz:dz/dl,lx:dz/dl,lz:-dx/dl};}
  else o=stnFrame(sg.st);
  B[0].hips.getWorldPosition(shHip);
  const a=C.a*Math.PI/180,r=C.r[0]+(C.r[1]-C.r[0])*u,ca=Math.cos(a),sa=Math.sin(a);
  shLookT.set(shHip.x,C.y,shHip.z);
  if(C.mid)shLookT.set(shHip.x+(S.bag.x-shHip.x)*C.mid,C.y,shHip.z+(S.bag.z-shHip.z)*C.mid);
  shCamT.set(shLookT.x+(o.fx*ca+o.lx*sa)*r,C.h[0]+(C.h[1]-C.h[0])*u,shLookT.z+(o.fz*ca+o.lz*sa)*r);
  const hh=0.012;shCamT.x+=Math.sin(t*0.9)*hh;shCamT.y+=Math.sin(t*1.3+1)*hh*0.7;shCamT.z+=Math.cos(t*0.7)*hh;
  if(i!==SHOW.seg){SHOW.seg=i;SHOW.cam.copy(shCamT);SHOW.look.copy(shLookT);}
  else{const k=1-Math.exp(-dt/1000*4);SHOW.cam.lerp(shCamT,k);SHOW.look.lerp(shLookT,k);}
  if(Math.abs(camera.fov-C.fov)>0.01){camera.fov=C.fov;camera.updateProjectionMatrix();}
  camera.position.copy(SHOW.cam);camera.lookAt(SHOW.look);cam.look.copy(SHOW.look);
  // turn left so he lands at x0 across the screen; on a tall portrait screen keep him near the middle
  const th=Math.tan(camera.fov*Math.PI/360)*camera.aspect,xs=camera.aspect<1?0.1:C.x0;
  camera.rotateY(Math.atan(xs*th));}

/* ---- the title screen: "press any button", then the menu ---- */
let titlePressed=false;
function titleStep(step){const el=$('#title');if(el)el.dataset.step=step;}
function titleWake(e){const el=$('#title');if(!el||el.hidden||el.dataset.step!=='press')return;
  if(e.type==='keydown'){if(e.key==='Escape'||e.key==='F11'||e.key==='Tab')return;e.preventDefault();e.stopImmediatePropagation();}
  titlePressed=true;titleStep('menu');setTimeout(()=>{const b=$('#btnCpu');if(b&&e.type==='keydown')b.focus({preventScroll:true});},50);}
window.addEventListener('keydown',titleWake,true);
window.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#fsBtn,#instBar,#fsHint'))return;titleWake(e);},true);
/* film grain for the title film: one small noise tile, moved about by CSS */
(function(){const c=document.createElement('canvas');c.width=c.height=160;const g=c.getContext('2d'),d=g.createImageData(160,160);
  for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}g.putImageData(d,0,0);
  const el=$('#showGrain');if(el)el.style.backgroundImage='url('+c.toDataURL()+')';})();
