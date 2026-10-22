/* South Paw · src/render/boxer.js
   Builds the boxer model (toon shapes on the skeleton). Colours come from data/fighters.js.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= BOXER MODEL: our toon parts riding the Mixamo skeleton (units: cm) ================= */
const SPH=TOUCH?new THREE.SphereGeometry(1,32,22):new THREE.SphereGeometry(1,44,30);
const segCache={};
const segG=r=>segCache[r]||(segCache[r]=new THREE.CylinderGeometry(r,r,1,22).translate(0,0.5,0));
function part(geo,mat,outline){const m=new THREE.Mesh(geo,mat);m.castShadow=true;if(outline!==false)m.add(new THREE.Mesh(geo,OUTLINE));return m;}
function ell(parent,mat,sx,sy,sz,x,y,z,outline){const m=part(SPH,mat,outline);m.scale.set(sx,sy,sz);m.position.set(x,y,z);parent.add(m);return m;}
function seg(bone,r,len,mat){const m=part(segG(r),mat);m.scale.y=len;bone.add(m);return m;}
/* ================= BOXER: the v3 model. Smooth toon shapes on the skeleton, bare-chested, ink outlines ================= */
const CORNERS=FIGHTER_LOOKS;   // data/fighters.js
function makeBoxer(c){
  const mats=[];const T=col=>{const m=toon(col);mats.push(m);return m;};
  const mSkin=T(c.skin),mTr=T(c.trunks),mTrim=T(c.trim),mGl=T(c.gloves),mShoe=T(0x16171c);
  const root=new THREE.Group(),skel=new THREE.Group();skel.scale.setScalar(0.01);root.add(skel);
  const bones=[];AD.bones.forEach(b=>{const o=new THREE.Object3D();o.position.fromArray(b.pos);bones.push(o);(b.p<0?skel:bones[b.p]).add(o);});
  const bn=n=>bones[BIDX[n]];
  ell(bn('Hips'),mTr,17.5,14,14,0,-3,0.5);
  const band=part(new THREE.CylinderGeometry(16.5,17,5,40),mTrim);band.position.set(0,7.5,0.5);bn('Hips').add(band);
  ell(bn('Spine'),mSkin,15,12,11.5,0,5,1.5);
  ell(bn('Spine1'),mSkin,17,12,12,0,5,0.5);
  ell(bn('Spine2'),mSkin,20,15.5,13,0,7,1);
  seg(bn('Neck'),5.6,9.6,mSkin);
  const hd=bn('Head');
  const skull=ell(hd,mSkin,10.4,11.4,11,0,9.5,3.5);   // one round head, no separate jaw
  if(c.hair!=null){const cap=new THREE.Mesh(new THREE.SphereGeometry(1,36,16,0,Math.PI*2,0,Math.PI*0.42),T(c.hair));cap.scale.set(10.4,12.3,11.4);cap.position.set(0,9.8,3.1);cap.rotation.x=-0.3;hd.add(cap);}
  const eyeM=new THREE.MeshBasicMaterial({color:0x0b0b0e});
  for(const s of [1,-1]){
    const e=new THREE.Mesh(SPH,eyeM);e.scale.setScalar(1.3);e.position.set(s*3.5,10.5,13.9);hd.add(e);
    const br=new THREE.Mesh(SPH,eyeM);br.scale.set(2.2,0.55,0.7);br.position.set(s*3.6,13.4,13.8);br.rotation.z=s*0.3;hd.add(br);
    ell(hd,mSkin,2.4,3,2,s*9.8,9.5,3);
  }
  const gloves=[];
  for(const side of ['Left','Right']){const s=side==='Left'?1:-1;
    const arm=bn(side+'Arm');ell(arm,mSkin,7,7,7,0,0,0);seg(arm,5.2,27.8,mSkin);
    const fa=bn(side+'ForeArm');ell(fa,mSkin,4.9,4.9,4.9,0,0,0);seg(fa,4.5,28.3,mSkin);
    const glove=new THREE.Group();bn(side+'Hand').add(glove);
    ell(glove,mGl,8.6,11,9.2,0,7,1);ell(glove,mGl,3.4,4.6,3.4,-s*5,6,4);
    const cuff=part(new THREE.CylinderGeometry(5.8,5.8,6,28),mTrim);cuff.position.set(0,-0.5,0.3);glove.add(cuff);
    gloves.push(glove);
    const ul=bn(side+'UpLeg');seg(ul,7,44.4,mSkin);
    const lg=bn(side+'Leg');ell(lg,mSkin,5.8,5.8,5.8,0,0,0);seg(lg,5.3,44.5,mSkin);
    ell(bn(side+'Foot'),mShoe,5.6,11,6.4,0,6,-1);ell(bn(side+'ToeBase'),mShoe,5,5,4,0,2,-0.5);
  }
  scene.add(root);
  return {root,skel,bones,gloves,head:skull,mats,flash:0,spine:bn('Spine'),hd,hips:bn('Hips')};
}
