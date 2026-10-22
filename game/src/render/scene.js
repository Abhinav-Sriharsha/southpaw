/* South Paw · src/render/scene.js
   Renderer, lights, toon shading, ring, arena and crowd.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= RENDERER / SCENE ================= */
const canvas=$('#c');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
catch(e){$('.tag').textContent='This browser could not start WebGL, so the ring cannot load. Try Chrome or Firefox with hardware acceleration on.';throw new Error('WebGL unavailable');}
const PR_MAX=TOUCH?Math.min(1.75,Math.max(window.devicePixelRatio||1,1)):Math.min(2,Math.max(window.devicePixelRatio||1,1.5));let pr=PR_MAX;
renderer.setPixelRatio(pr);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x07080c);scene.fog=new THREE.Fog(0x07080c,12,30);
const camera=new THREE.PerspectiveCamera(36,1,0.1,100);
const OUTLINE=new THREE.ShaderMaterial({
  uniforms:{uW:{value:1.7},uRes:{value:new THREE.Vector2(1,1)},uC:{value:new THREE.Color(0x0a0a10)}},
  vertexShader:'uniform float uW;uniform vec2 uRes;void main(){vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.0);vec3 vn=normalize(normalMatrix*normal);vec2 d=(projectionMatrix*vec4(vn,0.0)).xy;float l=length(d);d=l>1e-5?d/l:vec2(0.0);clip.xy+=d*uW*clip.w*2.0/uRes;gl_Position=clip;}',
  fragmentShader:'uniform vec3 uC;void main(){gl_FragColor=vec4(uC,1.0);}',side:THREE.BackSide});
const bufSize=new THREE.Vector2();
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.getDrawingBufferSize(bufSize);OUTLINE.uniforms.uRes.value.copy(bufSize);OUTLINE.uniforms.uW.value=1.7*pr;}
window.addEventListener('resize',resize);resize();
let ftAcc=0,ftN=0;
/* Resolution only drops when the device really can't keep up (under ~33 fps two checks in a row), never during loading,
   and climbs back as soon as frames are smooth again, so fast screens always stay at full sharpness. */
let resGrace=5000,resBad=0;const PR_MIN=1;
function adaptRes(dt){if(resGrace>0){resGrace-=dt;ftAcc=0;ftN=0;return;}ftAcc+=dt;ftN++;if(ftAcc<2000)return;const avg=ftAcc/ftN;ftAcc=0;ftN=0;
  if(avg>30){if(++resBad>=2&&pr>PR_MIN){pr=Math.max(PR_MIN,pr-0.25);renderer.setPixelRatio(pr);resize();resBad=0;}}
  else{resBad=0;if(avg<20&&pr<PR_MAX){pr=Math.min(PR_MAX,pr+0.25);renderer.setPixelRatio(pr);resize();}}}
const GRAD=(()=>{const d=new Uint8Array([62,62,62,255,150,150,150,255,255,255,255,255]);
  const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;})();
const toon=(c,extra)=>new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:GRAD},extra||{}));
scene.add(new THREE.HemisphereLight(0x8a96b8,0x121218,0.4));
const spot=new THREE.SpotLight(0xfff1dc,1.35,30,0.68,0.5,1);
spot.position.set(0,9.5,0.5);spot.castShadow=true;spot.shadow.mapSize.set(TOUCH?1024:2048,TOUCH?1024:2048);
spot.shadow.camera.near=3;spot.shadow.camera.far=20;spot.shadow.bias=-0.0005;spot.shadow.radius=3;
scene.add(spot);spot.target.position.set(0,0,0);scene.add(spot.target);
const rimR=new THREE.DirectionalLight(0xff4a35,0.45);rimR.position.set(-7,3,-3);scene.add(rimR);
const rimB=new THREE.DirectionalLight(0x3a7cff,0.45);rimB.position.set(7,3,3);scene.add(rimB);
const fill=new THREE.DirectionalLight(0xdfe6ff,0.25);scene.add(fill);scene.add(fill.target);

function makeCanvasTex(){
  const S=TOUCH?1024:2048,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  function draw(){seed=7;const k=S/2048;g.setTransform(k,0,0,k,0,0);g.fillStyle='#b8ad97';g.fillRect(0,0,2048,2048);
    for(let i=0;i<(TOUCH?9000:16000);i++){g.fillStyle=rnd()<.5?'rgba(0,0,0,.045)':'rgba(255,255,255,.045)';g.fillRect(rnd()*2048,rnd()*2048,3+rnd()*8,1.5+rnd()*2.5);}
    for(let i=0;i<60;i++){g.strokeStyle='rgba(60,40,30,'+(0.03+rnd()*0.05)+')';g.lineWidth=3+rnd()*14;g.beginPath();g.arc(rnd()*2048,rnd()*2048,40+rnd()*170,rnd()*6,rnd()*6+1.2);g.stroke();}
    g.strokeStyle='#8e2219';g.lineWidth=30;g.strokeRect(84,84,2048-168,2048-168);g.strokeStyle='rgba(20,30,60,.5)';g.lineWidth=9;g.strokeRect(140,140,2048-280,2048-280);
    g.save();g.translate(1024,1024);g.fillStyle='rgba(30,20,20,.07)';g.beginPath();g.arc(0,0,500,0,Math.PI*2);g.fill();
    g.transform(1,0,-0.16,1,0,0);g.textAlign='center';g.textBaseline='middle';
    g.fillStyle='rgba(128,26,20,.62)';g.font='900 340px "Big Shoulders Display", Impact, sans-serif';g.fillText('SOUTH PAW',0,-20);
    g.fillStyle='rgba(30,26,22,.5)';g.font='700 68px "Barlow", sans-serif';g.fillText('BASEMENT LEAGUE  ·  EST. 2006',0,200);g.restore();tex.needsUpdate=true;}
  draw();if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('900 340px "Big Shoulders Display"'),document.fonts.load('700 68px "Barlow"')]).then(draw).catch(()=>{});}
  return tex;
}
function makeApronTex(){
  const c=document.createElement('canvas');c.width=2048;c.height=200;const g=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();
  function draw(){g.setTransform(1,0,0,1,0,0);g.fillStyle='#12141c';g.fillRect(0,0,2048,200);g.fillStyle='#8e2219';g.fillRect(0,0,2048,18);
    g.fillStyle='#ffc83a';g.font='900 110px "Big Shoulders Display", Impact, sans-serif';g.textBaseline='middle';g.textAlign='center';
    g.save();g.translate(1024,112);g.transform(1,0,-0.18,1,0,0);g.fillText('SOUTH PAW',0,0);g.restore();
    g.fillStyle='rgba(244,239,228,.55)';g.font='700 38px "Barlow", sans-serif';g.fillText('BASEMENT LEAGUE',380,114);g.fillText('EST. 2006',1668,114);tex.needsUpdate=true;}
  draw();if(document.fonts&&document.fonts.load){document.fonts.load('900 110px "Big Shoulders Display"').then(draw).catch(()=>{});}
  return tex;
}
const R=4.3;const ringSides=[],ringCorners=[];
(function buildRing(){
  const front=new THREE.MeshBasicMaterial({map:makeApronTex()}),top=new THREE.MeshLambertMaterial({color:0x222222});
  const plat=new THREE.Mesh(new THREE.BoxGeometry(9.6,0.9,9.6),[front,front,top,top,front,front]);plat.position.y=-0.451;plat.receiveShadow=true;scene.add(plat);
  const cv=new THREE.Mesh(new THREE.PlaneGeometry(9.6,9.6),new THREE.MeshLambertMaterial({map:makeCanvasTex()}));cv.rotation.x=-Math.PI/2;cv.position.y=0.002;cv.receiveShadow=true;scene.add(cv);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshLambertMaterial({color:0x0c0d12}));floor.rotation.x=-Math.PI/2;floor.position.y=-0.9;scene.add(floor);
  [[-R,-R,0xf0432c],[R,-R,0xf4efe4],[R,R,0x2f7cf6],[-R,R,0xf4efe4]].forEach(([x,z,col])=>{
    const mats=[toon(0x8b909c,{transparent:true}),toon(col,{transparent:true})];
    const p=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.75,24),mats[0]);p.position.set(x,0.87,z);p.castShadow=true;scene.add(p);
    const pad=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,1.16,24),mats[1]);pad.position.set(x,0.98,z);scene.add(pad);
    ringCorners.push({n:new V3(x,0,z).normalize(),mats,a:1});});
  const ropeCols=[0xd8302a,0xf4efe4,0x2f6cf0],ropeHeights=[1.48,1.06,0.64],up=new V3(0,1,0);
  [[[-R,-R],[R,-R],[0,-1]],[[-R,-R],[-R,R],[-1,0]],[[R,-R],[R,R],[1,0]],[[-R,R],[R,R],[0,1]]].forEach(([a,b,n])=>{const mats=[];
    ropeHeights.forEach((h,i)=>{const mat=toon(ropeCols[i],{transparent:true});mats.push(mat);
      const A=new V3(a[0],h,a[1]),Bv=new V3(b[0],h,b[1]),d=new V3().subVectors(Bv,A),len=d.length();
      const m=new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.034,len,16),mat);m.position.copy(A).addScaledVector(d,0.5);m.quaternion.setFromUnitVectors(up,d.normalize());scene.add(m);});
    ringSides.push({n:new V3(n[0],0,n[1]),mats,a:1});});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(4.6,9,48,1,true),new THREE.MeshBasicMaterial({color:0xfff0d0,transparent:true,opacity:0.035,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  cone.position.set(0,4.5,0);scene.add(cone);
  const truss=new THREE.Mesh(new THREE.BoxGeometry(7,0.25,7),new THREE.MeshLambertMaterial({color:0x101218}));truss.position.y=8.4;scene.add(truss);
})();
const camDirC=new V3();
function updateRingFade(dt){camDirC.set(camera.position.x,0,camera.position.z).normalize();const k=1-Math.exp(-dt/1000*10);
  for(const s of ringSides){const t=s.n.dot(camDirC)>0.42?0.14:1;s.a+=(t-s.a)*k;for(const m of s.mats){m.opacity=s.a;m.depthWrite=s.a>0.9;}}
  for(const c of ringCorners){const t=c.n.dot(camDirC)>0.72?0.14:1;c.a+=(t-c.a)*k;for(const m of c.mats){m.opacity=c.a;m.depthWrite=c.a>0.9;}}}
const crowd=(function(){
  const seats=[];const addRow=(axis,sign,dist,y,from,to)=>{for(let s=from;s<=to;s+=0.72){const j=rand(-0.14,0.14);
    seats.push(axis==='z'?new V3(s+j,y,sign*dist+rand(-.1,.1)):new V3(sign*dist+rand(-.1,.1),y,s+j));}};
  for(let r=0;r<4;r++){const y=-0.55+r*0.52,dd=7.4+r*0.9;addRow('z',-1,dd,y,-dd,dd);addRow('z',1,dd,y,-dd,dd);addRow('x',-1,dd,y,-dd+0.8,dd-0.8);addRow('x',1,dd,y,-dd+0.8,dd-0.8);}
  const n=seats.length;
  const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(0.46,0.66,0.32),new THREE.MeshLambertMaterial({color:0xffffff}),n);
  const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(0.15,12,10),new THREE.MeshLambertMaterial({color:0xffffff}),n);
  const col=new THREE.Color();const data=[];
  seats.forEach((p,i)=>{const r=Math.random();if(r<.12)col.setHSL(0.01,0.65,0.3);else if(r<.24)col.setHSL(0.6,0.6,0.3);else col.setHSL(Math.random(),0.18,rand(0.09,0.2));
    bodies.setColorAt(i,col);col.setHSL(0.07,0.3,rand(0.16,0.34));heads.setColorAt(i,col);data.push({p,yaw:Math.atan2(-p.x,-p.z),w:rand(5,9),ph:rand(0,6.28),lean:rand(-.1,.1)});});
  bodies.frustumCulled=false;heads.frustumCulled=false;scene.add(bodies,heads);return {bodies,heads,data};})();
const dummy=new THREE.Object3D(),cF=new V3(),cV=new V3();
function updateCrowd(){const t=realT/1000,C=camera.position;cF.subVectors(cam.look,C);const reach=cF.length()+0.5;cF.normalize();
  for(let i=0;i<crowd.data.length;i++){const d=crowd.data[i];cV.set(d.p.x-C.x,d.p.y+0.6-C.y,d.p.z-C.z);const along=cV.dot(cF);let hide=cV.length()<2.6;
    if(!hide&&along>0&&along<reach){const lat=Math.sqrt(Math.max(0,cV.lengthSq()-along*along));hide=lat<1.3+along*0.2;}
    const b=Math.max(0,Math.sin(t*d.w+d.ph))*(0.012+crowdExcite*0.2);dummy.scale.setScalar(hide?0.0001:1);
    dummy.position.set(d.p.x,d.p.y+0.33+b,d.p.z);dummy.rotation.set(0,d.yaw,d.lean);dummy.updateMatrix();crowd.bodies.setMatrixAt(i,dummy.matrix);
    dummy.position.y=d.p.y+0.82+b*1.15;dummy.updateMatrix();crowd.heads.setMatrixAt(i,dummy.matrix);}
  crowd.bodies.instanceMatrix.needsUpdate=true;crowd.heads.instanceMatrix.needsUpdate=true;}
