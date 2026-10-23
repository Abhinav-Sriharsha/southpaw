/* South Paw · tools/anim/model.mjs
   Turns a Mixamo character (FBX downloaded "With Skin") into a game model file, game/assets/models/<name>.js.
   Run:  cd tools/anim && npm install && node model.mjs fbx/models/fighter03.fbx fighter03
   What it does:
   - scales the character so its hips sit at the same height as the game's skeleton (the fight is judged on that skeleton);
   - folds finger, toe-end and head-top bones into their parent, so the mesh rides the game's 22 bones;
   - tags every vertex with a part (skin, trunks, gloves, hair, waistband, cuffs) from the character's colour palette,
     so the game can paint the red and blue corners;
   - stores the rest pose of each bone, which the game turns into the skinning bind pose.
   The palette rules below are for this character's 2x2 texture; a new character with a different texture needs its own PARTS rule. */
import fs from 'fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
// FBXLoader wants a browser for embedded textures; we only need their colours, read below from the UVs.
globalThis.IMGS=[];globalThis.window={URL:{createObjectURL:b=>{IMGS.push(b);return 'blob:'+IMGS.length;}}};
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
const [,,SRC,NAME]=process.argv;if(!SRC||!NAME){console.log('usage: node model.mjs <file.fbx> <name>');process.exit(1);}
const buf=fs.readFileSync(SRC);const M=new FBXLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');
const BONES=['Hips','Spine','Spine1','Spine2','Neck','Head','LeftShoulder','LeftArm','LeftForeArm','LeftHand','RightShoulder','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'];
const GAME_HIPS=104.3;   // the game skeleton's rest hip height in cm (tools/anim/export.mjs, from Idle.fbx)
let sk=null;M.traverse(o=>{if(o.isSkinnedMesh&&!sk)sk=o;});if(!sk)throw new Error('no skinned mesh: download from Mixamo with Skin set to "With Skin"');
M.updateMatrixWorld(true);
const bones=sk.skeleton.bones,inv=sk.skeleton.boneInverses;
/* Fists. Mixamo characters are rigged with open hands (T-pose, palms down), and the game folds the finger bones into
   the hand, so the fingers are closed here before the mesh is baked. Each joint turns about the axis across the finger
   (finger direction x down), which rolls the fingertip under toward the palm; the thumb then folds across the fingers. */
const FB=n=>bones.find(b=>b.name==='mixamorig'+n);
const wp=o=>{o.updateMatrixWorld(true);return new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);};
function turnWorld(bone,axis,ang){const q=new THREE.Quaternion().setFromAxisAngle(axis,ang),wq=new THREE.Quaternion(),pq=new THREE.Quaternion();
  bone.getWorldQuaternion(wq);bone.parent.getWorldQuaternion(pq);bone.quaternion.copy(pq.invert().multiply(q.multiply(wq)));bone.updateMatrixWorld(true);}
const DOWN=new THREE.Vector3(0,1,0);   // the side the palm faces in this rig's rest pose (checked by eye: -Y bent the fingers backwards)
for(const side of ['Left','Right']){
  for(const f of ['Index','Middle','Ring','Pinky'])[[1,1.5],[2,1.65],[3,1.2]].forEach(([j,ang])=>{const b=FB(side+'Hand'+f+j),c=FB(side+'Hand'+f+(j+1));if(!b||!c)return;
    const d=wp(c).sub(wp(b)).normalize(),ax=new THREE.Vector3().crossVectors(d,DOWN).normalize();turnWorld(b,ax,ang);});
  // thumb: fold its tip toward the middle of the index finger, a little per joint
  const tgt=()=>wp(FB(side+'HandIndex2')).lerp(wp(FB(side+'HandMiddle2')),0.35).add(new THREE.Vector3(0,-0.015,0));
  [[1,0.45],[2,0.6],[3,0.6]].forEach(([j,frac])=>{const b=FB(side+'HandThumb'+j),tip=FB(side+'HandThumb4')||FB(side+'HandThumb3');if(!b||!tip)return;
    const o=wp(b),u=wp(tip).sub(o).normalize(),v=tgt().sub(o).normalize(),ax=new THREE.Vector3().crossVectors(u,v);const l=ax.length();if(l<1e-6)return;
    turnWorld(b,ax.divideScalar(l),Math.asin(Math.min(1,l))*frac);});}
M.updateMatrixWorld(true);
const skinM=bones.map((b,i)=>new THREE.Matrix4().multiplyMatrices(b.matrixWorld,inv[i]));   // posed (fists) relative to bind
// each source bone -> one of the 22 game bones (walk up the parents until a game bone)
const map=bones.map(b=>{let o=b;while(o&&o.isBone){const n=o.name.replace('mixamorig','');const i=BONES.indexOf(n);if(i>=0)return i;o=o.parent;}return 0;});
const rest=bones.map(()=>null);bones.forEach((b,i)=>{rest[i]=new THREE.Matrix4().copy(inv[i]).invert();});
const hipsSrc=bones.findIndex(b=>b.name==='mixamorigHips');const hipY=new THREE.Vector3().setFromMatrixPosition(rest[hipsSrc]).y;
const K=GAME_HIPS/hipY;console.log('scale',K.toFixed(3),'(source units -> cm)');
// rest pose of the 22 game bones: position (cm) and world rotation
const restOut=BONES.map(n=>{const i=bones.findIndex(b=>b.name==='mixamorig'+n);if(i<0)throw new Error('missing bone '+n);
  const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();rest[i].decompose(p,q,s);
  return {p:p.multiplyScalar(K).toArray().map(v=>+v.toFixed(2)),q:q.toArray().map(v=>+v.toFixed(5))};});
// vertices in the bind space, then cm
const g=sk.geometry,P=g.attributes.position,N=g.attributes.normal,UV=g.attributes.uv,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight;
const bm=sk.bindMatrix,nm=new THREE.Matrix3().getNormalMatrix(bm);
const idx=g.index?g.index.array:null,count=idx?idx.length:P.count;
const v=new THREE.Vector3(),n=new THREE.Vector3();
// palette of this character: texture corners -> part. top-left skin, bottom-left red trunks, top-right green gloves, bottom-right black.
function partOf(u,w,bone){const right=u>=0.5,top=w>=0.5;
  if(!right&&top)return (bone==='LeftFoot'||bone==='RightFoot'||bone==='LeftToeBase'||bone==='RightToeBase')?6:0;   // skin (feet: shoes)
  if(!right&&!top)return 1;                     // trunks
  if(right&&top)return 2;                       // gloves
  if(bone==='Head'||bone==='Neck')return 3;      // black on the head: hair, eyes, brows
  if(bone.indexOf('Hand')>=0||bone.indexOf('ForeArm')>=0)return 5;  // black at the wrist: glove cuffs
  return 4;}                                     // black at the waist: waistband
const keyOf=new Map(),pos=[],nor=[],part=[],sidx=[],swt=[],tri=[];
for(let t=0;t<count;t++){const i=idx?idx[t]:t;
  v.fromBufferAttribute(P,i).applyMatrix4(bm);n.fromBufferAttribute(N,i).applyMatrix3(nm);
  { // skin with the fists: blend of the bone matrices, then into cm
    const mm=new THREE.Matrix4().set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);for(let j=0;j<4;j++){const w=SW.getComponent(i,j);if(w<=0)continue;const e=skinM[SI.getComponent(i,j)].elements;for(let q=0;q<16;q++)mm.elements[q]+=e[q]*w;}
    v.applyMatrix4(mm).multiplyScalar(K);n.applyMatrix3(new THREE.Matrix3().setFromMatrix4(mm)).normalize();}
  // fold weights onto the 22 game bones, keep the four strongest
  const acc=new Map();for(let j=0;j<4;j++){const w=SW.getComponent(i,j);if(w<=0)continue;const gb=map[SI.getComponent(i,j)];acc.set(gb,(acc.get(gb)||0)+w);}
  const ws=[...acc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);let tot=ws.reduce((s,e)=>s+e[1],0)||1;
  const q8=ws.map(e=>Math.round(e[1]/tot*255));let d=255-q8.reduce((s,x)=>s+x,0);q8[0]+=d;
  while(ws.length<4){ws.push([0,0]);q8.push(0);}
  const pt=partOf(UV.getX(i),UV.getY(i),BONES[ws[0][0]]);
  const key=[v.x.toFixed(2),v.y.toFixed(2),v.z.toFixed(2),n.x.toFixed(2),n.y.toFixed(2),n.z.toFixed(2),pt].join(',');
  let k=keyOf.get(key);
  if(k===undefined){k=pos.length/3;keyOf.set(key,k);pos.push(v.x,v.y,v.z);nor.push(n.x,n.y,n.z);part.push(pt);ws.forEach(e=>sidx.push(e[0]));q8.forEach(x=>swt.push(x));}
  tri.push(k);}
// pack: positions int16 (0.1 mm), normals int8, parts/skin indices/weights uint8, triangles uint16
const nv=pos.length/3;const parts=[new Int16Array(pos.map(x=>Math.round(x*100))),new Int8Array(nor.map(x=>Math.round(x*127))),new Uint8Array(part),new Uint8Array(sidx),new Uint8Array(swt),new Uint16Array(tri)];
const b64=parts.map(a=>Buffer.from(a.buffer).toString('base64'));
const box=new THREE.Box3();for(let i=0;i<nv;i++)box.expandByPoint(v.set(pos[i*3],pos[i*3+1],pos[i*3+2]));
const out={name:NAME,nv,nt:tri.length/3,rest:restOut,parts:['skin','trunks','gloves','hair','band','cuffs','shoes'],data:b64};
const OUT='../../game/assets/models/'+NAME+'.js';
fs.writeFileSync(OUT,'/* South Paw · assets/models/'+NAME+'.js\n   Generated by tools/anim/model.mjs from '+SRC.split('/').pop()+'. Do not edit by hand. */\nwindow.SP_MODELS=window.SP_MODELS||{};window.SP_MODELS['+JSON.stringify(NAME)+']='+JSON.stringify(out)+';\n');
const cnt={};part.forEach(p=>cnt[out.parts[p]]=(cnt[out.parts[p]]||0)+1);
console.log('wrote',OUT,nv,'vertices',tri.length/3,'triangles',(fs.statSync(OUT).size/1024).toFixed(0)+' KB','height',box.max.y.toFixed(1),'cm',JSON.stringify(cnt));
