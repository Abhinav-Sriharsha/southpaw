/* South Paw · src/render/camera.js
   Broadcast, close and front cameras, knockdown and replay shots.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= CAMERA ================= */
const cam={pos:new V3(0,2.6,8),look:new V3(0,1.2,0),trauma:0,kick:0,ang:0,angV:0,mid:new V3(),init:false,push:new V3()};
const cTP=new V3(),cTL=new V3(),cS=new V3(),cL=new V3(),UPV=new V3(0,1,0);
function camFar(){const aspect=camera.aspect||1;return clamp(1.75/aspect,TOUCH?0.92:1,2.3);}
function updateCamera(dt,va,vb){
  const ds=dt/1000,far=camFar(),pr=S.mode==='practice';
  const dx=vb.x-va.x,dz=vb.z-va.z,dl=Math.hypot(dx,dz)||1e-4,tAng=Math.atan2(-dz/dl,dx/dl);
  const mx=(va.x+vb.x)/2,mz=(va.z+vb.z)/2;
  if(!cam.init){cam.ang=tAng;cam.angV=0;cam.mid.set(mx,0,mz);cam.init=true;}
  const st=S.state;
  if(st!=='replay'&&st!=='ko'){const diff=wrapA(tAng-cam.ang),K=pr?20:30,C=2*Math.sqrt(K);cam.angV+=(K*diff-C*cam.angV)*ds;cam.ang=wrapA(cam.ang+cam.angV*ds);
    const mk2=1-Math.exp(-ds*(pr?6:8));cam.mid.x+=(mx-cam.mid.x)*mk2;cam.mid.z+=(mz-cam.mid.z)*mk2;}
  let k=pr?8:12,snap=false;
  // zoom depends only on the gap between the two fighters: a steady frame at fighting range, pulling out as they separate
  cam.gap=cam.gap===undefined?dl:cam.gap+(dl-cam.gap)*(1-Math.exp(-ds*4));
  const zoom=3.9+1.25*Math.max(0,cam.gap-1.1);
  const bcast=(out,look,extra)=>{const dist=zoom*far*(extra||1);out.set(cam.mid.x+Math.sin(cam.ang)*dist,1.75+((extra||1)>1?0.5:0),cam.mid.z+Math.cos(cam.ang)*dist);look.set(cam.mid.x,1.22,cam.mid.z);};
  const koF=S.koWinner>=0?S.F[1-S.koWinner]:null;
  if(S.mode==='attract'){bcast(cTP,cTL,1.45);k=3;if(st==='ko'&&koF){headPos(koF);cTL.copy(hP);}}
  else if(st==='replay'&&S.rp&&S.rp.kind==='prac'){const rp=S.rp,prog=(rp.pos-rp.start)/Math.max(1,rp.end-rp.start),ang=cam.ang+lerp(-0.9,0.9,prog),r=2.4;
    cTP.set(va.x+Math.sin(ang)*r,1.35,va.z+Math.cos(ang)*r);cTL.set(va.x,1.2,va.z);snap=true;}
  else if(st==='replay'&&S.rp){const rp=S.rp,c=S.koPos,prog=(rp.pos-rp.start)/Math.max(1,rp.end-rp.start),near=1-smooth(0,80,Math.abs(rp.pos-rp.ko));
    const ang=cam.ang+lerp(-1.05,0.75,prog),r=lerp(3.0,1.7,near);cTP.set(c[0]+Math.sin(ang)*r,lerp(1.15,1.45,prog),c[2]+Math.cos(ang)*r);cTL.set(c[0],c[1]-0.15,c[2]);snap=true;}
  else if(st==='down'&&S.down){const df=S.F[S.down.i];headPos(df);const a=cam.ang+0.6;cTP.set(hP.x+Math.sin(a)*3.0,1.7,hP.z+Math.cos(a)*3.0);cTL.set(hP.x,Math.max(0.6,hP.y),hP.z);k=2.5;}
  else if(st==='ko'&&koF){headPos(koF);const a=cam.ang+0.45+S.stateT*0.00012;cTP.set(hP.x+Math.sin(a)*2.4,1.45,hP.z+Math.cos(a)*2.4);cTL.copy(hP);k=3.5;}
  else if(!pr&&(st==='roundEnd'||st==='matchEnd'||st==='post')&&S.matchWinner>=0&&S.F[S.matchWinner].action==='win'){
    const wv=S.matchWinner===LOC()?va:vb,fy=wv.yaw+0.5;cTP.set(wv.x+Math.sin(fy)*2.6,1.3,wv.z+Math.cos(fy)*2.6);cTL.set(wv.x,1.45,wv.z);k=2.2;}
  else if(camMode===1){const dist=2.6*far;cTP.set(cam.mid.x+Math.sin(cam.ang)*dist,1.45,cam.mid.z+Math.cos(cam.ang)*dist);cTL.set(cam.mid.x,1.25,cam.mid.z);}
  else if(camMode===2){const a=cam.ang+1.15,dist=2.8*far;cTP.set(va.x+Math.sin(a)*dist,1.5,va.z+Math.cos(a)*dist);cTL.set(va.x+dx*0.25,1.25,va.z+dz*0.25);}
  else bcast(cTP,cTL,1);
  if(st==='intro'){const dur=pr?1200:1700,u=easeInOut(clamp(S.stateT/dur,0,1)),a0=cam.ang-1.05;bcast(cS,cL,1);
    cTP.set(lerp(cam.mid.x+Math.sin(a0)*6.2*far,cS.x,u),lerp(3.9,cS.y,u),lerp(cam.mid.z+Math.cos(a0)*6.2*far,cS.z,u));cTL.set(cL.x,lerp(0.9,1.22,u),cL.z);snap=true;}
  if(snap){cam.pos.copy(cTP);cam.look.copy(cTL);}else{const a=1-Math.exp(-ds*k);cam.pos.lerp(cTP,a);cam.look.lerp(cTL,a);}
  cam.trauma=Math.max(0,cam.trauma-ds*1.5);cam.kick=Math.max(0,cam.kick-ds*3.5);
  const s=cam.trauma*cam.trauma,t=realT/1000;
  cam.push.multiplyScalar(Math.exp(-ds*16));
  camera.position.set(cam.pos.x+cam.push.x+s*0.12*Math.sin(t*41),cam.pos.y+cam.push.y+s*0.09*Math.sin(t*37+1.3),cam.pos.z+cam.push.z+s*0.12*Math.sin(t*29+2));
  camera.lookAt(cam.look);camera.rotateZ(s*0.05*Math.sin(t*23));
  const fov=36-cam.kick*1.6;if(Math.abs(camera.fov-fov)>0.01){camera.fov=fov;camera.updateProjectionMatrix();}
  fill.position.copy(camera.position).add(UPV);fill.target.position.copy(cam.look);
}
