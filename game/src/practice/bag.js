/* South Paw · src/practice/bag.js
   The heavy bag used in practice mode.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= HEAVY BAG (practice) ================= */
const PIVOT_Y=3.35,BAG_L=1.9,BAG_R=0.2,BAG_HH=0.65,BAG_DROP=0.15;   // the bag is 1.3 m tall, top 0.5 m above the swing point BAG_L, bottom about 0.65 m off the floor
const DENT={u:{uDentP:{value:new THREE.Vector3()},uDentA:{value:0},uDentR:{value:0.085}},a:0,v:0,body:null};
const bagGroup=(function(){
  const pivot=new THREE.Group();pivot.position.set(0,PIVOT_Y,0);scene.add(pivot);
  const leather=toon(0x7a1c16),dark=toon(0x15161b),gold=toon(0xffc83a),metal=toon(0x9aa0ab);
  leather.onBeforeCompile=sh=>{Object.assign(sh.uniforms,DENT.u);
    sh.vertexShader='uniform vec3 uDentP;uniform float uDentA;uniform float uDentR;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfloat dd=distance(position,uDentP);transformed-=normal*uDentA*exp(-dd*dd/(uDentR*uDentR));');};
  const body=part(new THREE.CylinderGeometry(BAG_R,BAG_R,BAG_HH*2,TOUCH?48:72,TOUCH?20:30),leather);body.position.y=-BAG_L-BAG_DROP;pivot.add(body);DENT.body=body;
  const capT=part(new THREE.CylinderGeometry(BAG_R+0.006,BAG_R+0.006,0.07,40),dark);capT.position.y=-BAG_L+0.5;pivot.add(capT);
  const capB=part(new THREE.CylinderGeometry(BAG_R+0.006,BAG_R-0.02,0.08,40),dark);capB.position.y=-BAG_L-BAG_DROP-BAG_HH;pivot.add(capB);
  const band=part(new THREE.CylinderGeometry(BAG_R+0.004,BAG_R+0.004,0.14,40),gold);band.position.y=-BAG_L+0.2;pivot.add(band);
  const sw=part(new THREE.SphereGeometry(0.035,16,12),metal);sw.position.y=-1.0;pivot.add(sw);
  const ch=part(new THREE.CylinderGeometry(0.012,0.012,1.0,8),metal);ch.position.y=-0.5;pivot.add(ch);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4,top=new V3(0,-1.0,0),bot=new V3(Math.cos(a)*BAG_R*0.85,-BAG_L+0.53,Math.sin(a)*BAG_R*0.85);
    const d=new V3().subVectors(bot,top),len=d.length();const c=part(new THREE.CylinderGeometry(0.008,0.008,len,6),metal);
    c.position.copy(top).addScaledVector(d,0.5);c.quaternion.setFromUnitVectors(new V3(0,1,0),d.normalize());pivot.add(c);}
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,8.3-PIVOT_Y,8),toon(0x2a2d35));cable.position.y=(8.3+PIVOT_Y)/2;scene.add(cable);
  return {pivot,cable,mats:[leather]};
})();
function showBag(on){bagGroup.pivot.visible=on;bagGroup.cable.visible=on;}
function bagCenter(b){return [dsin(b.tx)*BAG_L,dsin(b.tz)*BAG_L];}
function stepBag(dt){const b=S.bag;
  b.wx+=(-5.2*b.tx-0.85*b.wx)*dt;b.tx=clamp(b.tx+b.wx*dt,-0.55,0.55);
  b.wz+=(-5.2*b.tz-0.85*b.wz)*dt;b.tz=clamp(b.tz+b.wz*dt,-0.55,0.55);
  b.bobV+=(-140*b.bob-9*b.bobV)*dt;b.bob+=b.bobV*dt;b.flash=Math.max(0,b.flash-dt*11);
  const c=bagCenter(b);b.x=c[0];b.z=c[1];}
/* ---- contact: the bag is a real solid ----
   bagAxis(y): the bag's centre at height y (the bag hangs from the pivot, so a tilt moves its bottom more than its top).
   bagContact: the punching glove touches the bag's surface (checked every tick, like punches on a fighter), so the glove
   stops on the leather instead of sinking in. bagCollide: the fighter's head and chest push the bag away (it swings off
   them) and the bag can never pass through the fighter. */
const BAG_YC=PIVOT_Y-BAG_L-BAG_DROP,BAG_YR=BAG_HH+0.04;
function bagAxis(y){const k=(PIVOT_Y+S.bag.bob-y)/BAG_L;return [S.bag.x*k,S.bag.z*k];}
function bagContact(a){if(a.bagAtk!==a.attackId){a.bagAtk=a.attackId;a.bagGap=undefined;}const m=a.move,g=cp(simPoint(a,m.hand==='R'?B_RH:B_LH,[0,7,1])),b=S.bag;
  if(g[1]<BAG_YC+b.bob-BAG_YR||g[1]>BAG_YC+b.bob+BAG_YR)return null;
  const c=bagAxis(g[1]),dx=g[0]-c[0],dz=g[2]-c[1],d=dhyp(dx,dz)||1e-4,gap=d-BAG_R-GLOVE_R,t1=a.vis.t1;
  const pg=a.bagGap,pt=a.bagT1;a.bagGap=gap;a.bagT1=t1;
  if(gap>=0.015)return null;                                         // within 1.5 cm of the leather counts as a touch
  // the glove moves several cm per tick: freeze it at the frame where it met the surface, between last tick and this one
  const cut=(pg!==undefined&&pg>gap&&pt<t1)?pt+(t1-pt)*clamp(pg/(pg-gap),0,1):t1;
  return {x:c[0]+dx/d*BAG_R,y:g[1],z:c[1]+dz/d*BAG_R,nx:-dx/d,nz:-dz/d,cut};}
const BAG_TMAX=0.55;
function bagCollide(f){const b=S.bag;
  const P=[[cp(simHead(f)),HEAD_R+0.02],[cp(simPoint(f,B_SP2,[0,9,1])),TORSO_R+0.04],[cp(simPoint(f,B_SP0,[0,4,2])),TORSO_R+0.04],
    [cp(simPoint(f,B_LH,[0,7,1])),GLOVE_R],[cp(simPoint(f,B_RH,[0,7,1])),GLOVE_R]];
  if(isAtk(f.action)&&!f.resolved)P.splice(f.move.hand==='R'?4:3,1);   // the punching glove is left to bagContact until the punch lands or misses
  for(const [p,r] of P){if(p[1]<BAG_YC+b.bob-BAG_YR||p[1]>BAG_YC+b.bob+BAG_YR)continue;
    const c=bagAxis(p[1]),dx=c[0]-p[0],dz=c[1]-p[2],d=dhyp(dx,dz)||1e-4,need=BAG_R+r;if(d>=need)continue;
    const ux=dx/d,uz=dz/d,k=(PIVOT_Y+b.bob-p[1])/BAG_L,sh=(need-d)/Math.max(0.5,k);
    let nx=b.x+ux*sh,nz=b.z+uz*sh;const lim=Math.sin(BAG_TMAX)*BAG_L*0.98;
    const sx=clamp(nx,-lim,lim),sz=clamp(nz,-lim,lim);
    if(sx!==nx||sz!==nz){const rest=dhyp(nx-sx,nz-sz)*k;f.x-=ux*rest;f.z-=uz*rest;}      // bag at full swing: the fighter gives way
    b.x=sx;b.z=sz;b.tx=Math.asin(clamp(sx/BAG_L,-1,1));b.tz=Math.asin(clamp(sz/BAG_L,-1,1));
    const vn=b.wx*ux+b.wz*uz;if(vn<0){b.wx-=1.4*vn*ux;b.wz-=1.4*vn*uz;}}                 // swinging into the fighter: bounce off
  const dx=f.x-b.x,dz=f.z-b.z,d=dhyp(dx,dz)||1e-4,mn=BAG_MIN+0.06;if(d<mn){f.x=b.x+dx/d*mn;f.z=b.z+dz/d*mn;}
  f.x=clamp(f.x,-BOUND,BOUND);f.z=clamp(f.z,-BOUND,BOUND);}
let bagFlashShown=0;
function applyBag(v){bagGroup.pivot.rotation.set(-v.tz,0,v.tx);bagGroup.pivot.position.y=PIVOT_Y+v.bob;
  if(Math.abs(v.flash-bagFlashShown)>0.01){bagFlashShown=v.flash;bagGroup.mats.forEach(m=>m.emissive.setRGB(v.flash*0.16,v.flash*0.11,v.flash*0.07));}}
