/* South Paw · tools/anim/export.mjs
   Turns the Mixamo FBX files in ./fbx into game/assets/anim/clips.js.
   Run:  cd tools/anim && npm install && node export.mjs
   CLIPS  short name used in the game -> FBX file. Every FBX must be the same Mixamo character ("Without Skin" is fine), 30 fps.
   KEEP   optional [first, last] frame range to keep (trims loops and lead-ins).
   LOCO   stepping clips: their root motion is stored separately so the game can move the fighter itself.
   ENDALIGN  get-up clips: aligned so the last frame matches the idle stance.
   After adding a clip here, also add its short name to CLIPN in game/src/anim/clips.js, in the same order as below. */
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const L = new FBXLoader();
const load=f=>{const b=fs.readFileSync('fbx/'+f);return L.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const BONES=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];
const base=load('Idle.fbx');
const B=n=>base.getObjectByName('mixamorig'+n);
const bones=BONES.map(n=>{const o=B(n);const p=o.parent&&o.parent.isBone?BONES.indexOf(o.parent.name.replace('mixamorig','')):-1;return {n,p,pos:o.position.toArray().map(v=>+v.toFixed(2)),q:o.quaternion.toArray().map(v=>+v.toFixed(5))};});
const CLIPS={idle:'Idle.fbx',fwd:'Short_Step_Forward_1.fbx',back:'Step_Backward_1.fbx',sl:'Short_Left_Side_Step.fbx',sr:'Short_Right_Side_Step.fbx',walkf:'Walking.fbx',walkb:'Walking_Backwards.fbx',ml:'Medium_Left_Side_Step.fbx',mr:'Medium_Right_Side_Step.fbx',ll:'Long_Left_Side_Step.fbx',lr:'Long_Right_Side_Step.fbx',dodge:'Dodging_1.fbx',
  jc1:'jab_cross.fbx',hook:'Hook_1.fbx',upS:'Boxing_2.fbx',upL:'Boxing_1.fbx',block:'Body_Block.fbx',hitL:'Head_Hit.fbx',hitH:'Head_Hit_1.fbx',
  ko:'Knocked_Out.fbx',ko2:'Knocked_Out_1.fbx',win:'Victory.fbx',
  hLL:'hit_on_the_left_side_head_light.fbx',hLM:'hit_on_the_left_side_head_medium.fbx',hRL:'hit_on_the_right_side_head_light.fbx',hRM:'hit_on_the_right_side_head_medium.fbx',
  uLL:'hit_on_the_left_side_face_with_uppercut_light.fbx',uLM:'hit_on_the_left_side_face_with_uppercut_medium.fbx',uRL:'hit_on_the_right_side_face_with_uppercut_light.fbx',uRM:'hit_on_the_right_side_face_with_uppercut_medium.fbx',
  kid:'Kidney_Hit.fbx',sto:'Stomach_Hit.fbx',liv:'Livershot_Knockdown.fbx',
  gL:'Getting_Up_after_light_injury.fbx',gM:'Getting_Up_after_medium_injury.fbx',gH:'Getting_Up_after_heavy_injury.fbx',kdf:'Knocked_Out_1.fbx',
  t1:'Taunt.fbx',t2:'Taunt_2.fbx',t3:'Taunt_3.fbx',jab3:'Jab_Cross_1.fbx',
  rj:'right_hand_jab.fbx',rhN:'right_hand_hook_normal.fbx',rhL:'right_hand_hook_long.fbx',ruN:'right_hand_uppercut_normal.fbx',ruH:'right_hand_uppercut_heavy.fbx',
  bhN:'Body_Block__hit_normal.fbx',bhH:'Body_Block_hit_heavy.fbx',bLL:'Body_Block_left_hit_light.fbx',bLH:'Body_Block_left_hit_heavy.fbx',bRL:'Body_Block_right_hit_light.fbx',bRH:'Body_Block_right_hit_heavy.fbx'};
const LOCO=new Set(['idle','fwd','back','sl','sr','walkf','walkb','ml','mr','ll','lr']);
const KEEP={upS:[30,74],upL:[30,74],dodge:[0,67],ko:[28,110],ko2:[32,105],win:[0,96],block:[20,50],
  hLL:[20,40],hLM:[18,34],hRL:[17,33],hRM:[31,58],uLL:[15,32],uLM:[19,40],uRL:[15,32],uRM:[19,38],kid:[18,50],sto:[18,46],liv:[42,128],
  gL:[34,125],gM:[35,150],gH:[34,185],kdf:[32,122],t1:[5,80],t2:[24,72],t3:[7,80],
  rj:[0,40],rhN:[14,47],rhL:[18,63],ruN:[30,63],ruH:[30,62],bhN:[22,50],bhH:[30,60],bLL:[25,50],bLH:[32,60],bRL:[34,64],bRH:[37,70]};
const ENDALIGN=new Set(['gL','gM','gH']); // trim ranges (frames)

// Knockdown fall: Knocked_Out_1 ends face-down but turned and far away. Warp the root progressively so the fall
// lands exactly where the get-up clips start (face-down, head toward the opponent), and so it starts in the fighter's own spot.
function headDir(fr){const tmp=[];B('Hips').position.fromArray(fr.hp);BONES.forEach((n,i)=>B(n).quaternion.fromArray(fr.qs[i]));base.updateMatrixWorld(true);
  const h=new THREE.Vector3();B('Head').getWorldPosition(h);const p=new THREE.Vector3();B('Hips').getWorldPosition(p);return {dx:h.x-p.x,dz:h.z-p.z,hp:fr.hp.slice()};}
function warpFall(frames){
  const G=out.gM[0],tg=headDir(G),en=headDir(frames[frames.length-1]);
  const th=Math.atan2(tg.dx,tg.dz)-Math.atan2(en.dx,en.dz);
  const piv=frames[0].hp.slice(),n=frames.length,ys=frames.map(f=>f.hp[1]),y0=ys[0],y1=ys[n-1];
  // progress = how far the hips have dropped, so the turn happens while the body falls
  const qy=new THREE.Quaternion(),qh=new THREE.Quaternion(),ax=new THREE.Vector3(0,1,0);
  const endR=(()=>{const c=Math.cos(th),s=Math.sin(th),x=en.hp[0]-piv[0],z=en.hp[2]-piv[2];return [piv[0]+x*c+z*s,piv[2]-x*s+z*c];})();
  const T=[tg.hp[0]-endR[0],tg.hp[2]-endR[1]];
  let wmax=0;
  frames.forEach((fr,k)=>{let w=Math.min(1,Math.max(0,(y0-fr.hp[1])/(y0-y1)));wmax=Math.max(wmax,w);w=wmax;w=w*w*(3-2*w);
    const a=th*w,c=Math.cos(a),s=Math.sin(a),x=fr.hp[0]-piv[0],z=fr.hp[2]-piv[2];
    fr.hp[0]=piv[0]+x*c+z*s+T[0]*w;fr.hp[2]=piv[2]-x*s+z*c+T[1]*w;fr.hp[1]=fr.hp[1]+(tg.hp[1]-y1)*w;
    qy.setFromAxisAngle(ax,a);qh.fromArray(fr.qs[0]);qh.premultiply(qy);fr.qs[0]=qh.toArray();});
  console.log('warp kdf: turn',(th*180/Math.PI).toFixed(1),'deg, shift',T.map(v=>v.toFixed(1)).join(','));
}
const mixer=new THREE.AnimationMixer(base);
const ints=[];const meta={};
let idle0=null;
const v=new THREE.Vector3(),q=new THREE.Quaternion();
const out={};const curves={};
for(const [name,file] of Object.entries(CLIPS)){
  const g=load(file),clip=g.animations[0];
  mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().play();
  const N=Math.round(clip.duration*30);const [s,e]=KEEP[name]||[0,N];
  const frames=[];
  for(let i=s;i<=e;i++){a.time=Math.min(i/30,clip.duration);mixer.update(0);
    frames.push({hp:B('Hips').position.toArray(),qs:BONES.map(n=>B(n).quaternion.toArray())});}
  if(name==='idle')idle0=frames[0].hp.slice();
  if(LOCO.has(name)&&name!=='idle'){const n=frames.length,rx=[],rz=[];
    for(let k=0;k<n;k++){const p=frames[Math.min(k,n-2)].hp,q=frames[Math.min(k+1,n-1)].hp;rx.push(+((q[0]-p[0])/100).toFixed(4));rz.push(+((q[2]-p[2])/100).toFixed(4));}
    curves[name]={rx,rz};}
  if(name==='dodge'){const n=frames.length,rx=[],rz=[];
    for(let k=0;k<n;k++){const p=frames[Math.min(k,n-2)].hp,q=frames[Math.min(k+1,n-1)].hp;rx.push(0);rz.push(+((q[2]-p[2])/100).toFixed(4));}
    curves[name]={rx,rz};}
  const h0=frames[0].hp.slice(),hE=frames[frames.length-1].hp.slice();
  frames.forEach((fr,k)=>{
    if(LOCO.has(name)){fr.hp[0]=idle0[0];fr.hp[2]=idle0[2];}
    else if(name==='dodge'){fr.hp[0]+=idle0[0]-h0[0];fr.hp[2]=idle0[2];}
    else if(ENDALIGN.has(name)){fr.hp[0]+=idle0[0]-hE[0];fr.hp[2]+=idle0[2]-hE[2];}
    else if(name==='kdf'){fr.hp[0]+=idle0[0]-h0[0];fr.hp[2]+=idle0[2]-h0[2];}
    else if(name==='ko'||name==='ko2'){fr.hp[0]=idle0[0]+(fr.hp[0]-h0[0])*0.55;fr.hp[2]=idle0[2]+(fr.hp[2]-h0[2])*0.55;}
    else{fr.hp[0]+=idle0[0]-h0[0];fr.hp[2]+=idle0[2]-h0[2];}
  });
  if(name==='kdf')warpFall(frames);
  // quaternion sign continuity per bone
  for(let b=0;b<BONES.length;b++)for(let k=1;k<frames.length;k++){const p=frames[k-1].qs[b],c=frames[k].qs[b];if(p[0]*c[0]+p[1]*c[1]+p[2]*c[2]+p[3]*c[3]<0)for(let j=0;j<4;j++)c[j]=-c[j];}
  meta[name]=Object.assign({o:ints.length,n:frames.length},curves[name]||{});
  for(const fr of frames){for(const x of fr.hp)ints.push(Math.round(x*10));for(const qq of fr.qs)for(const x of qq)ints.push(Math.round(x*32767));}
  out[name]=frames;
}
const arr=new Int16Array(ints);
const b64=Buffer.from(arr.buffer).toString('base64');
const OUT='../../game/assets/anim/clips.js';
fs.writeFileSync(OUT,'/* South Paw · assets/anim/clips.js\n   Generated by tools/anim/export.mjs from the Mixamo FBX files. Do not edit by hand. */\nwindow.SP_ANIM='+JSON.stringify({bones,fps:30,meta,b64})+';\n');
console.log('wrote',OUT,Object.keys(meta).length,'clips,',(b64.length/1024).toFixed(0),'KB');
