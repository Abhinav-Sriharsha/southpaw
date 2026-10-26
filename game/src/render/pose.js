/* South Paw · src/render/pose.js
   Puts a pose onto a boxer model every frame: smoothing, foot planting, flashes.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const qX=new THREE.Quaternion(),eX=new THREE.Euler();
let renderDt=16;
function inertialize(b,v,P){
  if(!b.iq){b.iq=new Float32Array(NB*4);b.ih=new Float32Array(3);b.pq=new Float32Array(NB*4);b.ph=new Float32Array(3);b.iw=0;b.ev=-1;b.has=false;}
  if(b.has&&v.ev!==b.ev){
    for(let i=0;i<NB;i++){const o=i*4;let ax=b.pq[o],ay=b.pq[o+1],az=b.pq[o+2],aw=b.pq[o+3];
      const bx=-P.q[o],by=-P.q[o+1],bz=-P.q[o+2],bw=P.q[o+3];
      let x=aw*bx+ax*bw+ay*bz-az*by,y=aw*by-ax*bz+ay*bw+az*bx,z=aw*bz+ax*by-ay*bx+az*bw,w=aw*bw-ax*bx-ay*by-az*bz;
      if(w<0){x=-x;y=-y;z=-z;w=-w;}b.iq[o]=x;b.iq[o+1]=y;b.iq[o+2]=z;b.iq[o+3]=w;}
    for(let k=0;k<3;k++)b.ih[k]=b.ph[k]-P.hp[k];b.iw=1;
  }
  b.ev=v.ev;
  if(b.iw>0.002){const k=b.iw;
    for(let i=0;i<NB;i++){const o=i*4;let ox=b.iq[o]*k,oy=b.iq[o+1]*k,oz=b.iq[o+2]*k,ow=1-k+b.iq[o+3]*k;const l=1/Math.hypot(ox,oy,oz,ow);ox*=l;oy*=l;oz*=l;ow*=l;
      const qx=P.q[o],qy=P.q[o+1],qz=P.q[o+2],qw=P.q[o+3];
      P.q[o]=ow*qx+ox*qw+oy*qz-oz*qy;P.q[o+1]=ow*qy-ox*qz+oy*qw+oz*qx;P.q[o+2]=ow*qz+ox*qy-oy*qx+oz*qw;P.q[o+3]=ow*qw-ox*qx-oy*qy-oz*qz;}
    for(let j=0;j<3;j++)P.hp[j]+=b.ih[j]*k;
    b.iw*=Math.exp(-renderDt/70);
  }else b.iw=0;
  b.pq.set(P.q);b.ph.set(P.hp);b.has=true;
}
/* Code-driven dodge with planted feet: record where the feet are, duck and shift the hips, lean the torso,
   then bend each leg (two-bone IK) so the feet land exactly back where they were. */
const fkA=new V3(),fkB=new V3(),fkC=new V3(),fkT=[new V3(),new V3()],fkQ=[new THREE.Quaternion(),new THREE.Quaternion()];
const fkN=new V3(),fkU=new V3(),fkV=new V3(),fq1=new THREE.Quaternion(),fq2=new THREE.Quaternion(),fq3=new THREE.Quaternion();
function rotBoneWorld(bone,qWorld){bone.getWorldQuaternion(fq2);fq2.premultiply(qWorld);bone.parent.getWorldQuaternion(fq3);bone.quaternion.copy(fq3.invert().multiply(fq2));bone.updateMatrixWorld(true);}
function legIK(up,lo,ft,T,Fq){
  up.getWorldPosition(fkA);lo.getWorldPosition(fkB);ft.getWorldPosition(fkC);
  const a=fkA.distanceTo(fkB),b=fkB.distanceTo(fkC),d=clamp(fkA.distanceTo(T),Math.abs(a-b)+1e-4,a+b-1e-4);
  fkU.subVectors(fkA,fkB).normalize();fkV.subVectors(fkC,fkB).normalize();
  fkN.crossVectors(fkU,fkV);if(fkN.lengthSq()<1e-8){up.getWorldQuaternion(fq1);fkN.set(1,0,0).applyQuaternion(fq1);}fkN.normalize();
  const cur=Math.acos(clamp(fkU.dot(fkV),-1,1)),want=Math.acos(clamp((a*a+b*b-d*d)/(2*a*b),-1,1));
  fq1.setFromAxisAngle(fkN,want-cur);rotBoneWorld(lo,fq1);
  ft.getWorldPosition(fkC);fkU.subVectors(fkC,fkA).normalize();fkV.subVectors(T,fkA).normalize();
  fq1.setFromUnitVectors(fkU,fkV);rotBoneWorld(up,fq1);
  lo.getWorldQuaternion(fq3);ft.quaternion.copy(fq3.invert().multiply(fq1.copy(Fq)));ft.updateMatrixWorld(true);
}
function footLockDodge(b,v,pre){
  if(!b.legs)b.legs=['Left','Right'].map(s=>[b.bones[BIDX[s+'UpLeg']],b.bones[BIDX[s+'Leg']],b.bones[BIDX[s+'Foot']]]);
  b.root.updateMatrixWorld(true);
  if(!pre)b.legs.forEach((L,i)=>{L[2].getWorldPosition(fkT[i]);L[2].getWorldQuaternion(fkQ[i]);});
  bodyMods(v,BM);b.hips.position.x+=BM.hx;b.hips.position.y+=BM.hy;b.hips.position.z+=BM.hz;
  eX.set(BM.ex,BM.ey,BM.ez);qX.setFromEuler(eX);b.spine.quaternion.multiply(qX);
  b.root.updateMatrixWorld(true);
  b.legs.forEach((L,i)=>legIK(L[0],L[1],L[2],fkT[i],fkQ[i]));
}
function applyVis(b,v){
  b.root.position.set(v.x,0,v.z);b.root.rotation.y=v.yaw;
  evalPose(v,PO);
  let ok=isFinite(PO.hp[0]+PO.hp[1]+PO.hp[2]);for(let i=0;ok&&i<PO.q.length;i++)if(!isFinite(PO.q[i]))ok=false;
  if(!ok){if(b.pq){PO.q.set(b.pq);PO.hp.set(b.ph);}else{sampleClip(0,0,PO);}}
  inertialize(b,v,PO);
  let pre=false;
  if((v.hipR||0)>0.01){ // feet stay where the stance has them while the hips turn with the punch
    if(!b.legs)b.legs=['Left','Right'].map(s=>[b.bones[BIDX[s+'UpLeg']],b.bones[BIDX[s+'Leg']],b.bones[BIDX[s+'Foot']]]);
    for(let i=0;i<NB;i++)b.bones[i].quaternion.fromArray(PL.q,i*4);b.hips.position.set(PL.hp[0],PL.hp[1],PL.hp[2]);b.root.updateMatrixWorld(true);
    b.legs.forEach((L,i)=>{L[2].getWorldPosition(fkT[i]);L[2].getWorldQuaternion(fkQ[i]);});pre=true;}
  for(let i=0;i<NB;i++)b.bones[i].quaternion.fromArray(PO.q,i*4);
  b.hips.position.set(PO.hp[0],PO.hp[1],PO.hp[2]);
  if(pre||Math.abs(v.sl)>0.002||v.sd>0.002||Math.abs(v.bk||0)>0.002||Math.abs(v.dl||0)>0.002||Math.abs(v.hz||0)>0.05)footLockDodge(b,v,pre);
  eX.set(v.hr,0,-v.hx*2.2);qX.setFromEuler(eX);b.hd.quaternion.multiply(qX);
  if(b.ue){b.root.updateMatrixWorld(true);LOOK.armsToSim(b);}   // the Superhero's gloves go where the fight's skeleton has them
  const sL=1/Math.sqrt(v.gsL),sR=1/Math.sqrt(v.gsR);b.gloves[0].scale.set(sL,v.gsL,sL);b.gloves[1].scale.set(sR,v.gsR,sR);
  if(Math.abs(v.flash-b.flash)>0.01){b.flash=v.flash;const f=v.flash*0.2;b.mats.forEach(m=>{const e=m.userData.em;if(m.emissive)m.emissive.setRGB((e?e.r:0)+f,(e?e.g:0)+f*0.85,(e?e.b:0)+f*0.72);});}
}
