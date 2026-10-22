/* South Paw · src/sim/skeleton.js
   The fight sim's own copy of the skeleton: where a glove, head or body is at any moment.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= SIM SKELETON: where any point of a boxer is, from the animation state alone =================
   Uses the same pose and the same bodyMods() as the renderer, so a punch lands where you see it land. */
const PH=mkPose();
const CHAIN={};
function chainTo(b){if(CHAIN[b])return CHAIN[b];const c=[];let i=b;while(i>=0){c.unshift(i);i=AD.bones[i].p;}return CHAIN[b]=c;}
const _q=[0,0,0,1],_qb=[0,0,0,1],_qe=[0,0,0,1],_qt=[0,0,0,1],_v=[0,0,0],SBM={hx:0,hy:0,hz:0,ex:0,ey:0,ez:0};
function qmul(a,b,o){const ax=a[0],ay=a[1],az=a[2],aw=a[3],bx=b[0],by=b[1],bz=b[2],bw=b[3];
  o[0]=aw*bx+ax*bw+ay*bz-az*by;o[1]=aw*by-ax*bz+ay*bw+az*bx;o[2]=aw*bz+ax*by-ay*bx+az*bw;o[3]=aw*bw-ax*bx-ay*by-az*bz;}
function qrot(q,x,y,z,o){const qx=q[0],qy=q[1],qz=q[2],qw=q[3],tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
  o[0]=x+qw*tx+(qy*tz-qz*ty);o[1]=y+qw*ty+(qz*tx-qx*tz);o[2]=z+qw*tz+(qx*ty-qy*tx);}
function qeuler(x,y,z,o){const c1=dcos(x/2),c2=dcos(y/2),c3=dcos(z/2),s1=dsin(x/2),s2=dsin(y/2),s3=dsin(z/2);
  o[0]=s1*c2*c3+c1*s2*s3;o[1]=c1*s2*c3-s1*c2*s3;o[2]=c1*c2*s3+s1*s2*c3;o[3]=c1*c2*c3-s1*s2*s3;}
const B_SPINE=BIDX.Spine,B_HEAD=BIDX.Head,B_SP1=BIDX.Spine1,B_LH=BIDX.LeftHand,B_RH=BIDX.RightHand;
const LP={x:0,y:0,z:0};
/* point on bone b (offset in cm, bone space) in the boxer's own frame, metres */
function fkLocal(v,b,off){evalPose(v,PH);bodyMods(v,SBM);
  const ch=chainTo(b);let px=PH.hp[0]+SBM.hx,py=PH.hp[1]+SBM.hy,pz=PH.hp[2]+SBM.hz;
  const h0=ch[0]*4;_q[0]=PH.q[h0];_q[1]=PH.q[h0+1];_q[2]=PH.q[h0+2];_q[3]=PH.q[h0+3];
  for(let k=1;k<ch.length;k++){const bi=ch[k],rp=AD.bones[bi].pos;qrot(_q,rp[0],rp[1],rp[2],_v);px+=_v[0];py+=_v[1];pz+=_v[2];
    const o=bi*4;_qb[0]=PH.q[o];_qb[1]=PH.q[o+1];_qb[2]=PH.q[o+2];_qb[3]=PH.q[o+3];
    if(bi===B_SPINE){qeuler(SBM.ex,SBM.ey,SBM.ez,_qe);qmul(_qb,_qe,_qt);_qb[0]=_qt[0];_qb[1]=_qt[1];_qb[2]=_qt[2];_qb[3]=_qt[3];}
    if(bi===B_HEAD){qeuler(v.hr,0,-v.hx*2.2,_qe);qmul(_qb,_qe,_qt);_qb[0]=_qt[0];_qb[1]=_qt[1];_qb[2]=_qt[2];_qb[3]=_qt[3];}
    qmul(_q,_qb,_qt);_q[0]=_qt[0];_q[1]=_qt[1];_q[2]=_qt[2];_q[3]=_qt[3];}
  qrot(_q,off[0],off[1],off[2],_v);LP.x=(px+_v[0])*0.01;LP.y=(py+_v[1])*0.01;LP.z=(pz+_v[2])*0.01;return LP;}
const SH={x:0,y:0,z:0};
function simPoint(f,b,off){const v=f.vis,p=fkLocal(v,b,off),c=dcos(v.yaw),sn=dsin(v.yaw);
  SH.x=v.x+p.x*c+p.z*sn;SH.y=p.y;SH.z=v.z-p.x*sn+p.z*c;return SH;}
const HEAD_OFF=[0,10,3],BODY_OFF=[0,4,10];
const simHead=f=>simPoint(f,B_HEAD,HEAD_OFF);
const simBody=f=>simPoint(f,B_SP1,BODY_OFF);
let HEAD_FWD=0.06,BODY_FWD=0.07;
(function(){const v=blankVis();const h=fkLocal(v,B_HEAD,HEAD_OFF);if(isFinite(h.z))HEAD_FWD=clamp(h.z,0.02,0.16);const b=fkLocal(v,B_SP1,BODY_OFF);if(isFinite(b.z))BODY_FWD=clamp(b.z,0.02,0.2);})();
