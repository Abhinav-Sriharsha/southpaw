/* South Paw · src/practice/bag.js
   The heavy bag used in practice mode.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= HEAVY BAG (practice) ================= */
const PIVOT_Y=3.35,BAG_L=1.9,BAG_R=0.2;
const DENT={u:{uDentP:{value:new THREE.Vector3()},uDentA:{value:0},uDentR:{value:0.085}},a:0,v:0,body:null};
const bagGroup=(function(){
  const pivot=new THREE.Group();pivot.position.set(0,PIVOT_Y,0);scene.add(pivot);
  const leather=toon(0x7a1c16),dark=toon(0x15161b),gold=toon(0xffc83a),metal=toon(0x9aa0ab);
  leather.onBeforeCompile=sh=>{Object.assign(sh.uniforms,DENT.u);
    sh.vertexShader='uniform vec3 uDentP;uniform float uDentA;uniform float uDentR;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfloat dd=distance(position,uDentP);transformed-=normal*uDentA*exp(-dd*dd/(uDentR*uDentR));');};
  const body=part(new THREE.CylinderGeometry(BAG_R,BAG_R,1.0,TOUCH?48:72,TOUCH?16:24),leather);body.position.y=-BAG_L;pivot.add(body);DENT.body=body;
  const capT=part(new THREE.CylinderGeometry(BAG_R+0.006,BAG_R+0.006,0.07,40),dark);capT.position.y=-BAG_L+0.5;pivot.add(capT);
  const capB=part(new THREE.CylinderGeometry(BAG_R+0.006,BAG_R-0.02,0.08,40),dark);capB.position.y=-BAG_L-0.5;pivot.add(capB);
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
let bagFlashShown=0;
function applyBag(v){bagGroup.pivot.rotation.set(-v.tz,0,v.tx);bagGroup.pivot.position.y=PIVOT_Y+v.bob;
  if(Math.abs(v.flash-bagFlashShown)>0.01){bagFlashShown=v.flash;bagGroup.mats.forEach(m=>m.emissive.setRGB(v.flash*0.16,v.flash*0.11,v.flash*0.07));}}
