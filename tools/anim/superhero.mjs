/* South Paw · tools/anim/superhero.mjs
   Turns the Superhero character (from the character viewer, tools/anim/superhero/custom_ue.json: a 65-bone rig with
   faces, hairstyles and outfits as parts) into the game's model files, bound to the game's own 22-bone skeleton.
   Run:  cd tools/anim && npm install && node superhero.mjs
   What it does, for every part (body, eyes, eyebrows, hair, beard, outfits, gloves):
   1. poses the character's skeleton like the game's rest pose: each bone turned so it points the same way as the
      matching game bone, the palms turned down like the game's T-pose, and the fingers closed into the fist of the
      boxing idle (superhero/fist.json);
   2. skins the part into that pose, then moves each point by its bone's joint offset so it sits on the game's joints
      (the two skeletons are almost the same size, so this barely changes his shape, and the gloves land where hits are judged);
   3. maps the 65 bones' weights onto the 22 game bones (fingers into the hand, toe tips into the toes) and turns the
      face and build shapes (morph targets) with the same pose so they still work;
   4. writes game/assets/models/superhero.js (the body and the parts the standard looks use) and
      game/assets/models/superhero/<part>.json (every other part, loaded only when a look needs it). */
import fs from 'fs';
import * as THREE from 'three';
const SRC=JSON.parse(fs.readFileSync('superhero/custom_ue.json','utf8'));
const FIST=JSON.parse(fs.readFileSync('superhero/fist.json','utf8')).fist;
globalThis.window={};eval(fs.readFileSync('../../game/assets/anim/clips.js','utf8'));const GB=window.SP_ANIM.bones;   // the game skeleton
const OUT='../../game/assets/models/';
const IN_MAIN=new Set(['body','eyes','Eyebrows_Regular','u_gloves','g_crew','u_wraps']);   // what the standard looks need at once
const SKIP=new Set([]);
const b64=(s,T)=>{const b=Buffer.from(s,'base64');return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
const enc=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');
/* ---- the game's rest pose (world) ---- */
const G=GB.map(()=>({p:new THREE.Vector3(),q:new THREE.Quaternion()}));
GB.forEach((b,i)=>{const lp=new THREE.Vector3().fromArray(b.pos),lq=new THREE.Quaternion().fromArray(b.q);
  if(b.p<0){G[i].p.copy(lp);G[i].q.copy(lq);}else{G[i].q.copy(G[b.p].q).multiply(lq);G[i].p.copy(lp.applyQuaternion(G[b.p].q).add(G[b.p].p));}});
const GI=Object.fromEntries(GB.map((b,i)=>[b.n,i]));
/* ---- the character's skeleton (world rest pose from the file) ---- */
const SK=SRC.skel,UI=Object.fromEntries(SK.map((b,i)=>[b.n,i]));
const bones=SK.map(b=>new THREE.Bone());bones.forEach((o,i)=>{o.name=SK[i].n;});
const root=new THREE.Group();
SK.forEach((b,i)=>{const bp=new THREE.Vector3(...b.pos),bq=new THREE.Quaternion(...b.q);
  if(b.p<0){bones[i].position.copy(bp);bones[i].quaternion.copy(bq);root.add(bones[i]);}
  else{const P=SK[b.p],pq=new THREE.Quaternion(...P.q).invert();bones[i].quaternion.copy(pq.clone().multiply(bq));bones[i].position.copy(bp.sub(new THREE.Vector3(...P.pos)).applyQuaternion(pq));bones[b.p].add(bones[i]);}});
root.updateMatrixWorld(true);
const REST=bones.map(o=>o.matrixWorld.clone()),RESTINV=REST.map(m=>m.clone().invert());
/* ---- which game bone each character bone becomes ---- */
const MAP={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',neck_01:'Neck',Head:'Head'};
for(const [s,S] of [['l','Left'],['r','Right']])Object.assign(MAP,{['clavicle_'+s]:S+'Shoulder',['upperarm_'+s]:S+'Arm',['lowerarm_'+s]:S+'ForeArm',['hand_'+s]:S+'Hand',
  ['thigh_'+s]:S+'UpLeg',['calf_'+s]:S+'Leg',['foot_'+s]:S+'Foot',['ball_'+s]:S+'ToeBase'});
const gameOf=SK.map((b,i)=>{let k=i;while(k>=0){if(MAP[SK[k].n])return GI[MAP[SK[k].n]];k=SK[k].p;}return GI.Hips;});
const ueOfGame={};for(const n in MAP)ueOfGame[GI[MAP[n]]]=UI[n];
/* ---- 1. pose it like the game's rest pose ---- */
const wp=o=>new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
function turnWorld(bone,q){const wq=new THREE.Quaternion(),pq=new THREE.Quaternion();bone.getWorldQuaternion(wq);bone.parent.getWorldQuaternion(pq);bone.quaternion.copy(pq.invert().multiply(q.clone().multiply(wq)));bone.updateMatrixWorld(true);}
function aim(ueBone,ueChild,gFrom,gTo){const b=bones[UI[ueBone]],c=bones[UI[ueChild]];const d=wp(c).sub(wp(b)).normalize(),t=G[GI[gTo]].p.clone().sub(G[GI[gFrom]].p).normalize();
  turnWorld(b,new THREE.Quaternion().setFromUnitVectors(d,t));}
aim('pelvis','spine_01','Hips','Spine');aim('spine_01','spine_02','Spine','Spine1');aim('spine_02','spine_03','Spine1','Spine2');aim('spine_03','neck_01','Spine2','Neck');aim('neck_01','Head','Neck','Head');
for(const [s,S] of [['l','Left'],['r','Right']]){
  aim('clavicle_'+s,'upperarm_'+s,S+'Shoulder',S+'Arm');aim('upperarm_'+s,'lowerarm_'+s,S+'Arm',S+'ForeArm');aim('lowerarm_'+s,'hand_'+s,S+'ForeArm',S+'Hand');
  aim('hand_'+s,'middle_01_'+s,S+'ForeArm',S+'Hand');
  // palm down, like the game's T-pose: turn the hand about its own length so the palm faces -Y
  {const h=bones[UI['hand_'+s]],fd=wp(bones[UI['middle_01_'+s]]).sub(wp(h)).normalize(),ac=wp(bones[UI['index_01_'+s]]).sub(wp(bones[UI['pinky_01_'+s]])).normalize();
   const palm=(s==='l'?new THREE.Vector3().crossVectors(fd,ac):new THREE.Vector3().crossVectors(ac,fd)).normalize();
   const want=new THREE.Vector3(0,-1,0).addScaledVector(fd,-fd.y).normalize(),cur=palm.addScaledVector(fd,-palm.dot(fd)).normalize();
   const ang=Math.atan2(new THREE.Vector3().crossVectors(cur,want).dot(fd),cur.dot(want));turnWorld(h,new THREE.Quaternion().setFromAxisAngle(fd,ang));}
  aim('thigh_'+s,'calf_'+s,S+'UpLeg',S+'Leg');aim('calf_'+s,'foot_'+s,S+'Leg',S+'Foot');aim('foot_'+s,'ball_'+s,S+'Foot',S+'ToeBase');}
// fists: the boxing idle's finger rotations
for(const n in FIST)if(UI[n]!==undefined){bones[UI[n]].quaternion.fromArray(FIST[n]);}
root.updateMatrixWorld(true);
const POSE=bones.map((o,i)=>new THREE.Matrix4().multiplyMatrices(o.matrixWorld,RESTINV[i]));
/* his own joints become the visual skeleton (so his shape is untouched), moved forward so his torso and head sit where the
   game's do; the Hips joint is the game's (the animations move it), and the upper and lower arm are stretched to the game's
   lengths so his punches reach as far as the fight says they do. In fights the game then pulls each glove onto the spot the
   hit detection uses (src/render/look.js, armsToSim). */
const SHIFT=new THREE.Vector3(0,0,G[GI.Hips].p.z-wp(bones[UI.pelvis]).z);
const VJ={};for(const n in MAP)VJ[GI[MAP[n]]]=wp(bones[UI[n]]).add(SHIFT);VJ[GI.Hips]=G[GI.Hips].p.clone();
const OFF=SK.map(()=>new THREE.Vector3());
for(const S of ['Left','Right']){const a=GI[S+'Arm'],f=GI[S+'ForeArm'],h=GI[S+'Hand'];
  const fNew=VJ[a].clone().add(VJ[f].clone().sub(VJ[a]).normalize().multiplyScalar(G[f].p.distanceTo(G[a].p)));
  const hNew=fNew.clone().add(VJ[h].clone().sub(VJ[f]).normalize().multiplyScalar(G[h].p.distanceTo(G[f].p)));
  const dF=fNew.clone().sub(VJ[f]),dH=hNew.clone().sub(VJ[h]);VJ[f]=fNew;VJ[h]=hNew;
  SK.forEach((b,i)=>{if(gameOf[i]===f)OFF[i].copy(dF);else if(gameOf[i]===h)OFF[i].copy(dH);});}
SK.forEach((b,i)=>OFF[i].add(SHIFT));
console.log('visual joints vs game (cm):\n'+Object.entries(MAP).map(([u,g])=>g.padEnd(14)+VJ[GI[g]].clone().sub(G[GI[g]].p).toArray().map(x=>x.toFixed(1).padStart(6)).join('')).join('\n'));
/* ---- 2-3. every part ---- */
const parts=[],index=[];const m3=new THREE.Matrix3(),v=new THREE.Vector3(),n=new THREE.Vector3(),M=new THREE.Matrix4();
for(const p of SRC.parts){if(SKIP.has(p.id))continue;
  const N=p.nv,pos=Float32Array.from(b64(p.pos,Int16Array),x=>x/20),nor=Float32Array.from(b64(p.nor,Int8Array),x=>x/127),si=b64(p.si,Uint8Array),sw=Float32Array.from(b64(p.sw,Uint8Array),x=>x/255);
  const P2=new Int16Array(N*3),N2=new Int8Array(N*3),SI2=new Uint8Array(N*4),SW2=new Uint8Array(N*4),mats=[];
  for(let i=0;i<N;i++){M.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const off=new THREE.Vector3(),acc=new Map();
    for(let j=0;j<4;j++){const w=sw[i*4+j];if(w<=0)continue;const b=si[i*4+j];const e=POSE[b].elements;for(let k=0;k<16;k++)M.elements[k]+=e[k]*w;off.addScaledVector(OFF[b],w);
      const g=gameOf[b];acc.set(g,(acc.get(g)||0)+w);}
    v.set(pos[i*3],pos[i*3+1],pos[i*3+2]).applyMatrix4(M).add(off);n.set(nor[i*3],nor[i*3+1],nor[i*3+2]).applyMatrix3(m3.setFromMatrix4(M)).normalize();
    P2.set([Math.round(v.x*20),Math.round(v.y*20),Math.round(v.z*20)],i*3);N2.set([Math.round(n.x*127),Math.round(n.y*127),Math.round(n.z*127)],i*3);
    const ws=[...acc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4),tot=ws.reduce((s,e)=>s+e[1],0)||1;let q8=ws.map(e=>Math.round(e[1]/tot*255));q8[0]+=255-q8.reduce((s,x)=>s+x,0);
    ws.forEach((e,j)=>{SI2[i*4+j]=e[0];SW2[i*4+j]=q8[j];});mats.push(m3.clone());}
  const out={id:p.id,slot:p.slot,label:p.label,nv:N,pos:enc(P2),nor:enc(N2),si:enc(SI2),sw:enc(SW2),ind:p.ind,i32:p.i32||0};
  if(p.role)out.role=p.role;if(p.mats)out.mats=p.mats;if(p.groups)out.groups=p.groups;if(p.tex)out.tex=p.tex;
  if(p.id==='body')out.bp=p.pos;   // the original height of every point: the kit is painted by it
  // 3. the shapes, turned with the same pose (morph deltas are directions, so only the rotation part applies)
  if(p.morphs){out.morphs={};for(const [name,mm] of Object.entries(p.morphs)){const ix=b64(mm.i,Uint16Array),dd=b64(mm.d,Int16Array),d2=new Int16Array(dd.length);
    for(let k=0;k<ix.length;k++){v.set(dd[k*3]/100,dd[k*3+1]/100,dd[k*3+2]/100).applyMatrix3(mats[ix[k]]);d2.set([Math.round(v.x*100),Math.round(v.y*100),Math.round(v.z*100)],k*3);}
    out.morphs[name]={i:mm.i,d:enc(d2)};}}
  parts.push(out);index.push({id:p.id,slot:p.slot,label:p.label,main:IN_MAIN.has(p.id)});}
/* ---- 4. files ---- */
const rest=G.map((g,i)=>({p:(VJ[i]||g.p).toArray().map(x=>+x.toFixed(3)),q:g.q.toArray().map(x=>+x.toFixed(6))}));   // visual joints, game rotations
const head={name:'superhero',ue:1,rest,paint:SRC.paint,morphNames:SRC.morphNames,roles:SRC.roles,index};
fs.mkdirSync(OUT+'superhero',{recursive:true});
const main=parts.filter(p=>IN_MAIN.has(p.id));
fs.writeFileSync(OUT+'superhero.js','/* South Paw · assets/models/superhero.js\n   Generated by tools/anim/superhero.mjs from the Superhero character. Do not edit by hand.\n   Holds the body and the parts the standard looks use; every other part is in assets/models/superhero/<id>.json. */\n'+
  'window.SP_MODELS=window.SP_MODELS||{};window.SP_MODELS.superhero='+JSON.stringify(Object.assign(head,{parts:main}))+';\n');
let extra=0;for(const p of parts)if(!IN_MAIN.has(p.id)){const s=JSON.stringify(p);fs.writeFileSync(OUT+'superhero/'+p.id+'.json',s);extra+=s.length;}
console.log('main',(fs.statSync(OUT+'superhero.js').size/1024).toFixed(0)+' KB,',main.length,'parts; on demand',(extra/1024).toFixed(0)+' KB,',parts.length-main.length,'parts');
