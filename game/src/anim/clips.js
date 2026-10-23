/* South Paw · src/anim/clips.js
   Decodes the Mixamo clips and builds every pose (sampling, blending, mirroring, aim, body bends).
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= ANIMATION DATA (Mixamo clips, retimed in code) ================= */
const AD=window.SP_ANIM;   // set by assets/anim/clips.js
const NB=AD.bones.length;
const BIDX={};AD.bones.forEach((b,i)=>BIDX[b.n]=i);
const LOWER=new Uint8Array(NB);['Hips','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','RightUpLeg','RightLeg','RightFoot','RightToeBase'].forEach(n=>LOWER[BIDX[n]]=1);
const CLIPN=['idle','fwd','back','sl','sr','jc1','hook','upS','upL','block','hitL','hitH','ko','ko2','win','walkf','walkb','ml','mr','ll','lr','dodge',
  'hLL','hLM','hRL','hRM','uLL','uLM','uRL','uRM','kid','sto','liv','gL','gM','gH','kdf','t1','t2','t3',
  'rj','rhN','rhL','ruN','ruH','bhN','bhH','bLL','bLH','bRL','bRH','jab3',
  's2s','neck','arms','warm','rope','squat','i2p','push','sbag'];   // the last row: the title-screen training film
const CI={};CLIPN.forEach((n,i)=>CI[n]=i);
const CL=(()=>{
  const bin=atob(AD.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  const raw=new Int16Array(u8.buffer);const per=3+NB*4;
  return CLIPN.map(n=>{const m=AD.meta[n],hp=new Float32Array(m.n*3),q=new Float32Array(m.n*NB*4);
    for(let f=0;f<m.n;f++){const o=m.o+f*per;hp[f*3]=raw[o]*0.1;hp[f*3+1]=raw[o+1]*0.1;hp[f*3+2]=raw[o+2]*0.1;
      for(let k=0;k<NB*4;k++)q[f*NB*4+k]=raw[o+3+k]/32767;}
    return {n:m.n,hp,q};});
})();
const mkPose=()=>({hp:new Float32Array(3),q:new Float32Array(NB*4)});
function sampleClip(ci,fr,out){
  const C=CL[ci];fr=clamp(fr,0,C.n-1);const i=Math.floor(fr),j=Math.min(i+1,C.n-1),t=fr-i;
  for(let k=0;k<3;k++)out.hp[k]=C.hp[i*3+k]+(C.hp[j*3+k]-C.hp[i*3+k])*t;
  const A=i*NB*4,Bq=j*NB*4;
  for(let b=0;b<NB;b++){const o=b*4;let x=C.q[A+o]+(C.q[Bq+o]-C.q[A+o])*t,y=C.q[A+o+1]+(C.q[Bq+o+1]-C.q[A+o+1])*t,
    z=C.q[A+o+2]+(C.q[Bq+o+2]-C.q[A+o+2])*t,w=C.q[A+o+3]+(C.q[Bq+o+3]-C.q[A+o+3])*t;const l=1/Math.sqrt(x*x+y*y+z*z+w*w);
    out.q[o]=x*l;out.q[o+1]=y*l;out.q[o+2]=z*l;out.q[o+3]=w*l;}
}
function blendPose(a,b,w,out,lowW){
  for(let bi=0;bi<NB;bi++){const ww=LOWER[bi]?w*lowW:w,o=bi*4;
    let bx=b.q[o],by=b.q[o+1],bz=b.q[o+2],bw=b.q[o+3];if(a.q[o]*bx+a.q[o+1]*by+a.q[o+2]*bz+a.q[o+3]*bw<0){bx=-bx;by=-by;bz=-bz;bw=-bw;}
    const x=a.q[o]+(bx-a.q[o])*ww,y=a.q[o+1]+(by-a.q[o+1])*ww,z=a.q[o+2]+(bz-a.q[o+2])*ww,w2=a.q[o+3]+(bw-a.q[o+3])*ww,l=1/Math.sqrt(x*x+y*y+z*z+w2*w2);
    out.q[o]=x*l;out.q[o+1]=y*l;out.q[o+2]=z*l;out.q[o+3]=w2*l;}
  const hw=w*lowW;for(let k=0;k<3;k++)out.hp[k]=a.hp[k]+(b.hp[k]-a.hp[k])*hw;
}
const copyPose=(a,out)=>{out.hp.set(a.hp);out.q.set(a.q);};
/* Right-hand punches borrow the left-hand clips: swap left and right bones and mirror each rotation across the body's centre plane */
const MATE=AD.bones.map(b=>{const n=b.n.startsWith('Left')?'Right'+b.n.slice(4):b.n.startsWith('Right')?'Left'+b.n.slice(5):b.n;return BIDX[n];});
const MTMP=new Float32Array(NB*4);
function mirrorPose(P){MTMP.set(P.q);for(let i=0;i<NB;i++){const s=MATE[i]*4,o=i*4;P.q[o]=MTMP[s];P.q[o+1]=-MTMP[s+1];P.q[o+2]=-MTMP[s+2];P.q[o+3]=MTMP[s+3];}P.hp[0]=-P.hp[0];}
const LARM=['LeftShoulder','LeftArm','LeftForeArm','LeftHand'].map(n=>BIDX[n]);
function maskLeftArm(P,base){for(const b of LARM){const o=b*4;P.q[o]=base.q[o];P.q[o+1]=base.q[o+1];P.q[o+2]=base.q[o+2];P.q[o+3]=base.q[o+3];}}
/* One formula for how dodges, body-shot crouches, lean-backs and weight shifts move the hips and bend the spine.
   The renderer and the fight simulation both use it, so what you see is what gets hit. */
function bodyMods(v,o){o.hx=v.sl*11;o.hy=-(v.sd*14+(v.bk||0)*12);o.hz=-v.sd*3-(v.dl||0)*9+(v.hz||0);
  o.ex=v.sd*0.3+(v.bk||0)*0.3-(v.dl||0)*0.35;o.ey=v.sl*0.12;o.ez=-v.sl*0.42;return o;}
const BM={hx:0,hy:0,hz:0,ex:0,ey:0,ez:0};
const PL=mkPose(),PT=mkPose(),P0=mkPose(),P1=mkPose(),PA=mkPose(),PO=mkPose();
const PF=mkPose(),PS=mkPose();
function chanPose(c,t,c0,t0,x,out){sampleClip(c,t,P1);if(x<0.999&&c0>=0){sampleClip(c0,t0,P0);blendPose(P0,P1,x,out,1);}else copyPose(P1,out);}
/* Stance (idle) + forward/back footwork channel + side-step channel, then the action layer on top */
function evalPose(v,out){
  sampleClip(0,v.it,PL);
  const a=v.fc>=0?v.fw:0,b=v.sc>=0?v.sw:0;
  if(a>0.001||b>0.001){
    if(a>0.001)chanPose(v.fc,v.ft,v.fc0,v.ft0,v.fx,PF);
    if(b>0.001)chanPose(v.sc,v.st,v.sc0,v.st0,v.sx,PS);
    let PM;if(a>0.001&&b>0.001){blendPose(PF,PS,b/(a+b),PT,1);PM=PT;}else PM=a>0.001?PF:PS;
    blendPose(PL,PM,Math.min(1,Math.max(a,b)),PL,1);
  }
  if(v.a0<0&&v.a1<0){copyPose(PL,out);return;}
  if(v.a0>=0){sampleClip(v.a0,v.t0,P0);if(v.mir0)mirrorPose(P0);if(v.msk0)maskLeftArm(P0,PL);}else copyPose(PL,P0);
  if(v.a1>=0){sampleClip(v.a1,v.t1,P1);if(v.mir)mirrorPose(P1);if(v.msk)maskLeftArm(P1,PL);}else copyPose(PL,P1);
  blendPose(P0,P1,v.bw,PA,1);
  const aw=isFinite(v.aw)?v.aw:1;blendPose(PL,PA,aw,out,v.low);
  // upper-body punches (mirrored or masked clips) still need the clip's hip turn, or the arm points the wrong way
  if(v.hipR>0.001){const o=BIDX.Hips*4,w=aw*v.hipR;let bx=PA.q[o],by=PA.q[o+1],bz=PA.q[o+2],bw=PA.q[o+3];
    if(PL.q[o]*bx+PL.q[o+1]*by+PL.q[o+2]*bz+PL.q[o+3]*bw<0){bx=-bx;by=-by;bz=-bz;bw=-bw;}
    const x=PL.q[o]+(bx-PL.q[o])*w,y=PL.q[o+1]+(by-PL.q[o+1])*w,z=PL.q[o+2]+(bz-PL.q[o+2])*w,ww=PL.q[o+3]+(bw-PL.q[o+3])*w,l=1/Math.sqrt(x*x+y*y+z*z+ww*ww);
    out.q[o]=x*l;out.q[o+1]=y*l;out.q[o+2]=z*l;out.q[o+3]=ww*l;}
  // aim: the Mixamo punches were made for a shorter target. Swing the punching arm up at the shoulder, about an axis fixed in the
  // body, so the glove arrives at the opponent's head. Applied here, so the fight sim and the renderer see the same arm.
  if(Math.abs(v.am||0)>1e-4)aimArm(out,v);
}
const AIMQ=new Float32Array(4),AIMW=new Float32Array(4),AIMT=new Float32Array(4),AIMC=[BIDX.Hips,BIDX.Spine,BIDX.Spine1,BIDX.Spine2];
function qm4(a,b,o){const ax=a[0],ay=a[1],az=a[2],aw=a[3],bx=b[0],by=b[1],bz=b[2],bw=b[3];
  o[0]=aw*bx+ax*bw+ay*bz-az*by;o[1]=aw*by-ax*bz+ay*bw+az*bx;o[2]=aw*bz+ax*by-ay*bx+az*bw;o[3]=aw*bw-ax*bx-ay*by-az*bz;}
function aimArm(out,v){
  const sh=v.amh?BIDX.RightShoulder:BIDX.LeftShoulder,arm=v.amh?BIDX.RightArm:BIDX.LeftArm;
  AIMW[0]=0;AIMW[1]=0;AIMW[2]=0;AIMW[3]=1;
  for(const b of [...AIMC,sh]){const o=b*4;AIMQ[0]=out.q[o];AIMQ[1]=out.q[o+1];AIMQ[2]=out.q[o+2];AIMQ[3]=out.q[o+3];qm4(AIMW,AIMQ,AIMT);AIMW.set(AIMT);}
  // local' = conj(Wp) * R * Wp * local
  const h=v.am/2,sn=dsin(h),R=[v.amx*sn,v.amy*sn,v.amz*sn,dcos(h)],cj=[-AIMW[0],-AIMW[1],-AIMW[2],AIMW[3]],o=arm*4,L=[out.q[o],out.q[o+1],out.q[o+2],out.q[o+3]];
  const t1=[0,0,0,0],t2=[0,0,0,0],t3=[0,0,0,0];qm4(R,AIMW,t1);qm4(cj,t1,t2);qm4(t2,L,t3);
  const l=1/Math.sqrt(t3[0]*t3[0]+t3[1]*t3[1]+t3[2]*t3[2]+t3[3]*t3[3]);out.q[o]=t3[0]*l;out.q[o+1]=t3[1]*l;out.q[o+2]=t3[2]*l;out.q[o+3]=t3[3]*l;}
