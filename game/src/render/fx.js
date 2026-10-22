/* South Paw · src/render/fx.js
   Hit sparks, trails, screen shake and flashes.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= FX (presentation) ================= */
function spriteTex(draw){const c=document.createElement('canvas');c.width=c.height=128;draw(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
const TEX_DOT=spriteTex(g=>{const grd=g.createRadialGradient(64,64,0,64,64,64);grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.4,'rgba(255,255,255,.6)');grd.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grd;g.fillRect(0,0,128,128);});
const TEX_RING2=spriteTex(g=>{g.strokeStyle='rgba(255,255,255,1)';g.lineWidth=2.5;g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.stroke();
  const grd=g.createRadialGradient(64,64,40,64,64,60);grd.addColorStop(0,'rgba(255,255,255,0)');grd.addColorStop(1,'rgba(255,255,255,.18)');g.fillStyle=grd;g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();});
const sprites=[];
for(let i=0;i<28;i++){const m=new THREE.SpriteMaterial({map:TEX_DOT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
  const s=new THREE.Sprite(m);s.visible=false;scene.add(s);sprites.push({s,life:0,max:1,s0:1,s1:1,o:1,on:false});}
function spr(tex,x,y,z,s0,s1,max,color,rot,depth,op){let it=sprites.find(q=>!q.on);if(!it)it=sprites[0];
  it.on=true;it.life=0;it.max=max;it.s0=s0;it.s1=s1;it.o=op===undefined?1:op;const m=it.s.material;m.map=tex;m.color.setHex(color);m.rotation=rot||0;m.depthTest=!!depth;m.opacity=it.o;
  it.s.position.set(x,y,z);it.s.scale.setScalar(s0);it.s.visible=true;}
const PN=220,pPos=new Float32Array(PN*3),pVel=new Float32Array(PN*3),pLife=new Float32Array(PN);for(let i=0;i<PN;i++)pPos[i*3+1]=-50;
const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xefe2cf,size:0.022,map:TEX_DOT,transparent:true,opacity:0.6,depthWrite:false,blending:THREE.AdditiveBlending}));
pts.frustumCulled=false;scene.add(pts);let pNext=0;
const SN=72,sPos=new Float32Array(SN*6),sCol=new Float32Array(SN*6),sVel=new Float32Array(SN*3),sP=new Float32Array(SN*3),sLife=new Float32Array(SN),sMax=new Float32Array(SN);
const sGeo=new THREE.BufferGeometry();sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));sGeo.setAttribute('color',new THREE.BufferAttribute(sCol,3));
const streaks=new THREE.LineSegments(sGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
streaks.frustumCulled=false;scene.add(streaks);let sNext=0;
const pulseEl=$('#pulse'),hurtEl=$('#hurt');
function pulse(el,a){if(!el)return;el.style.transition='none';el.style.opacity=a;void el.offsetWidth;el.style.transition='opacity .24s ease-out';el.style.opacity=0;}
const dW=new V3();

const LOC=()=>S&&S.mode==='online'?NET.local:0;
function buzz(ms){if(!TOUCH||!navigator.vibrate)return;try{navigator.vibrate(ms);}catch(e){}}
function addTrauma(x){cam.trauma=Math.min(1,cam.trauma+x*(reduceMotion?0.3:1));}
function spawnFx(e,live){const p=e.p,nx=-e.dx,nz=-e.dz,blk=e.blk;
  spr(TEX_DOT,e.x,e.y,e.z,0.06,(blk?0.14:0.2)+p*0.1,0.075,blk?0xdfeaff:0xfff1dc,0,false,blk?0.7:0.95);
  spr(TEX_RING2,e.x,e.y,e.z,0.05,(blk?0.22:0.32)+p*0.2,0.17+p*0.03,blk?0xd6e4ff:0xffe9cc,0,false,blk?0.4:0.55);
  const ns=blk?4:Math.round(5+p*7);
  for(let k=0;k<ns;k++){const i=sNext;sNext=(sNext+1)%SN;const sp=rand(2.6,5.2)*(0.7+p*0.4),side=rand(-0.75,0.75),up=rand(-0.25,0.9);
    sP[i*3]=e.x;sP[i*3+1]=e.y;sP[i*3+2]=e.z;sVel[i*3]=(nx-nz*side)*sp;sVel[i*3+1]=up*sp*0.7;sVel[i*3+2]=(nz+nx*side)*sp;sLife[i]=sMax[i]=rand(0.11,0.22);}
  const nd=blk?3:Math.round(6+p*8),body=!e.bag,sgn=body?-1:1;
  for(let k=0;k<nd;k++){const i=pNext;pNext=(pNext+1)%PN;pPos[i*3]=e.x+rand(-.04,.04);pPos[i*3+1]=e.y+rand(-.06,.06);pPos[i*3+2]=e.z+rand(-.04,.04);
    const f=rand(0.15,0.9)*(body?1.6:1),s=rand(-0.6,0.6);pVel[i*3]=nx*f*sgn-nz*s;pVel[i*3+1]=rand(-0.1,0.5);pVel[i*3+2]=nz*f*sgn+nx*s;pLife[i]=rand(0.4,0.85);}
  if(e.bag&&DENT.body){DENT.body.updateMatrixWorld(true);dW.set(e.x,e.y,e.z);DENT.body.worldToLocal(dW);DENT.u.uDentP.value.copy(dW);DENT.v-=0.75*(0.5+p*0.6);}
  const pk=blk?0.4:1;cam.push.x+=e.dx*0.03*p*pk;cam.push.z+=e.dz*0.03*p*pk;cam.push.y-=0.008*p*pk;
  if(S.mode!=='attract'){
    if(e.to===LOC()&&!blk&&!e.bag)pulse(hurtEl,0.18+0.3*p);
    else if(!blk&&p>0.55)pulse(pulseEl,0.12+0.18*p);
    if(p>0.95&&!blk)screenFlash(0.05);}
  hv.set(e.x,e.y,e.z).project(camera);Sfx.punch(e,clamp(hv.x*0.7,-0.7,0.7));
  if(live){addTrauma(e.tr||0);cam.kick=Math.max(cam.kick,e.kick||0);crowdExcite=Math.min(1,crowdExcite+(e.cr||0));
    if(S.mode!=='attract'&&!blk){if(e.bag)buzz(8+p*10);else if(e.by===LOC())buzz(10+p*14);else if(e.to===LOC())buzz(18+p*26);}}
}
const flashEl=$('#flash');
function screenFlash(a){if(reduceMotion)a*=0.4;flashEl.style.transition='none';flashEl.style.opacity=a;void flashEl.offsetWidth;flashEl.style.transition='opacity .28s ease-out';flashEl.style.opacity=0;}
function updateFx(dt){
  for(const it of sprites){if(!it.on)continue;it.life+=dt;const u=it.life/it.max;if(u>=1){it.on=false;it.s.visible=false;continue;}
    it.s.scale.setScalar(lerp(it.s0,it.s1,easeOut(u)));it.s.material.opacity=it.o*(1-u)*(1-u);}
  for(let i=0;i<PN;i++){if(pLife[i]<=0)continue;pLife[i]-=dt;if(pLife[i]<=0){pPos[i*3+1]=-50;continue;}
    const dr=Math.exp(-dt*3.5);pVel[i*3]*=dr;pVel[i*3+2]*=dr;pVel[i*3+1]=pVel[i*3+1]*dr-1.2*dt;
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;}
  pGeo.attributes.position.needsUpdate=true;
  for(let i=0;i<SN;i++){const j=i*6;
    if(sLife[i]<=0){for(let k=0;k<6;k++){sPos[j+k]=k===1||k===4?-50:0;sCol[j+k]=0;}continue;}
    sLife[i]-=dt;const dr=Math.exp(-dt*7);sVel[i*3]*=dr;sVel[i*3+2]*=dr;sVel[i*3+1]=sVel[i*3+1]*dr-4*dt;
    sP[i*3]+=sVel[i*3]*dt;sP[i*3+1]+=sVel[i*3+1]*dt;sP[i*3+2]+=sVel[i*3+2]*dt;
    const L=0.03;sPos[j]=sP[i*3];sPos[j+1]=sP[i*3+1];sPos[j+2]=sP[i*3+2];sPos[j+3]=sP[i*3]-sVel[i*3]*L;sPos[j+4]=sP[i*3+1]-sVel[i*3+1]*L;sPos[j+5]=sP[i*3+2]-sVel[i*3+2]*L;
    const c=Math.max(0,sLife[i]/sMax[i]);sCol[j]=1*c;sCol[j+1]=0.86*c;sCol[j+2]=0.62*c;sCol[j+3]=0.5*c;sCol[j+4]=0.3*c;sCol[j+5]=0.15*c;}
  sGeo.attributes.position.needsUpdate=true;sGeo.attributes.color.needsUpdate=true;
  {let rem=Math.min(dt,0.1);while(rem>1e-6){const h=Math.min(rem,1/240);rem-=h;DENT.v+=(-1100*DENT.a-24*DENT.v)*h;DENT.a+=DENT.v*h;}
   if(!isFinite(DENT.a)||!isFinite(DENT.v)){DENT.a=0;DENT.v=0;}DENT.a=clamp(DENT.a,-0.06,0.03);
   if(Math.abs(DENT.a)<1e-5&&Math.abs(DENT.v)<1e-4){DENT.a=0;DENT.v=0;}}
  DENT.u.uDentA.value=Math.max(0,-DENT.a);
}
function crowdFlashes(dt){const chance=(0.01+crowdExcite*crowdExcite*0.3)*dt*60;
  if(Math.random()<chance){const d=crowd.data[(Math.random()*crowd.data.length)|0];spr(TEX_DOT,d.p.x+rand(-.2,.2),d.p.y+1.0,d.p.z,0.35,0.7,0.08,0xffffff,0,true);}}
const TRAIL_MAT=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
function makeTrail(tint){const N=9,pos=new Float32Array(N*2*3),col=new Float32Array(N*2*3),idx=[];
  for(let i=0;i<N-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(idx);
  const mesh=new THREE.Mesh(geo,TRAIL_MAT);mesh.frustumCulled=false;scene.add(mesh);const P2=[];for(let i=0;i<N;i++)P2.push(new V3());return {N,P:P2,pos,col,geo,tint,live:false,mesh};}
const trails=[[makeTrail(CORNERS[0].trail),makeTrail(CORNERS[0].trail)],[makeTrail(CORNERS[1].trail),makeTrail(CORNERS[1].trail)]];
const tw1=new V3(),tw2=new V3(),tw3=new V3(),GOFF=new V3(0,7,1);
function updateTrail(T,glove,inten,advance){
  tw1.copy(GOFF);glove.localToWorld(tw1);
  if(!T.live||inten<=0.01){for(const p of T.P)p.copy(tw1);}else if(advance){for(let i=T.N-1;i>0;i--)T.P[i].copy(T.P[i-1]);T.P[0].copy(tw1);}
  T.live=inten>0.01;
  for(let i=0;i<T.N;i++){const a=T.P[Math.max(0,i-1)],b=T.P[Math.min(T.N-1,i+1)];
    tw2.subVectors(a,b);tw3.subVectors(camera.position,T.P[i]);tw2.cross(tw3);
    const l=tw2.length(),w=0.06*(1-i/(T.N-1));if(l>1e-6)tw2.multiplyScalar(w/l);else tw2.set(0,0,0);
    const p=T.P[i],j=i*6;T.pos[j]=p.x+tw2.x;T.pos[j+1]=p.y+tw2.y;T.pos[j+2]=p.z+tw2.z;T.pos[j+3]=p.x-tw2.x;T.pos[j+4]=p.y-tw2.y;T.pos[j+5]=p.z-tw2.z;
    const c=inten*Math.pow(1-i/(T.N-1),1.4)*0.9;for(let q=0;q<2;q++){T.col[j+q*3]=c*T.tint[0];T.col[j+q*3+1]=c*T.tint[1];T.col[j+q*3+2]=c*T.tint[2];}}
  T.geo.attributes.position.needsUpdate=true;T.geo.attributes.color.needsUpdate=true;}
