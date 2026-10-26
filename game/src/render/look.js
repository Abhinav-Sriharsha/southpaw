/* South Paw · src/render/look.js
   A fighter's look on the Superhero character (assets/models/superhero.js, made by tools/anim/superhero.mjs):
   face shape, hair, beard, eyebrows, eye colour, skin, build, and kit (shorts, top, gloves or wraps, boots, headgear).
   Set on the Customise screen (src/ui/customise.js), saved on this device, sent to the other player online.
   - Parts: the body, eyes and the chosen hair, beard, eyebrows and outfit pieces are separate skinned meshes on one
     skeleton. The parts the standard looks use come with the page; the rest load the first time a look needs them.
   - Face and build are shapes (morph targets) blended on the CPU when the look changes: one face at full strength,
     muscle and weight mixed the same way as in the character viewer (shapeWeights).
   - Classic trunks and boots are painted onto the body by the height of each point in the original model (kitMat).
   - The skeleton is his own (his shape is untouched); in fights armsToSim pulls each glove onto the spot the hit
     detection uses, because his shoulders are wider than the fight skeleton's. Only how he looks changes: every fighter
     has the same reach and the same places to hit.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const LOOK=(()=>{
const HEX=/^#[0-9a-f]{6}$/i;
const FACES=['Square jaw','Long and narrow','Round and soft','Brawler','Sharp','Wide nose','Strong chin'];
const BASE={face:'',hair:'g_crew',hairC:'#1b120d',beard:'',brow:'Eyebrows_Regular',eye:'#4a2a14',skin:'#d59a6c',mus:0.55,fat:0,
  bottom:'',trunk:'#d8302a',trim:'#f4efe4',top:'',topC:'#e9e4da',hands:'u_gloves',gloveC:'#d8302a',wrapC:'#efece4',feet:'mid',boot:'#16171c',sole:'#f4efe4',gear:''};
const CORNER=[Object.assign({},BASE),Object.assign({},BASE,{hair:'',hairC:'#15110e',skin:'#8a5636',trunk:'#1e5bd0',trim:'#ffc83a',gloveC:'#2b6ef2',face:'Strong chin'})];
const OPT={face:['',...FACES],beard:['','Hair_Beard'],brow:['','Eyebrows_Regular','Eyebrows_Female'],bottom:['','u_shorts_long','u_mma','u_briefs','u_track'],
  top:['','u_tank','u_tee','u_comp'],hands:['u_gloves','u_wraps',''],feet:['low','mid','u_boots','barefoot'],gear:['','u_headgear']};
const NAMES={bottom:{'':'Classic trunks',u_shorts_long:'Long trunks',u_mma:'Fight shorts',u_briefs:'Briefs',u_track:'Track pants'},top:{'':'Bare chest',u_tank:'Tank top',u_tee:'T-shirt',u_comp:'Compression top'},
  hands:{u_gloves:'Boxing gloves',u_wraps:'Hand wraps','':'Bare fists'},feet:{low:'Low boots',mid:'Classic boots',u_boots:'High boots',barefoot:'Barefoot'},brow:{'':'None',Eyebrows_Regular:'Regular',Eyebrows_Female:'Thin'},
  beard:{'':'Clean shaven',Hair_Beard:'Beard'},gear:{'':'None',u_headgear:'Headgear'}};
const PRESETS=[['Flyweight',0.25,-0.7],['Lightweight',0.4,-0.5],['Welterweight',0.55,-0.4],['Middleweight',0.65,-0.25],['Light heavyweight',0.75,-0.1],['Cruiserweight',0.85,0.1],['Heavyweight',0.85,0.4],['Super heavyweight',0.7,0.85],['Bodybuilder',1.0,-0.6],['Old-school brawler',0.45,0.6]];
const MD=()=>SP_MODELS[MODEL_NAME];
const HAIRS=()=>!MD()?['']:['',...MD().index.filter(p=>p.slot==='hair').map(p=>p.id)];
const label=id=>{const p=MD().index.find(x=>x.id===id);return p?p.label:id;};
/* looks saved by older versions (the low-poly fighter) are turned into this one */
const OLD_CUT={original:'g_crew',bald:'',buzz:'Hair_Buzzed',crew:'g_crew',curly:'g_twists',flat:'g_flattop',hightop:'g_hightop',afro:'g_afro',mohawk:'g_mohawk',faux:'g_fauxhawk',
  spiky:'g_fauxhawk',pomp:'g_slick',bun:'g_manbun',pony:'Hair_Long',dreads:'g_twists',rows:'g_cornrows',part:'Hair_SimpleParted',bowl:'Hair_SimpleParted'};
function fromOld(o){const n={};if(o.cut in OLD_CUT)n.hair=OLD_CUT[o.cut];const c=(k,to)=>{if(typeof o[k]==='string')n[to]=o[k];};
  c('hair','hairC');c('eye','eye');c('skin','skin');c('trunks','trunk');c('band','trim');c('wraps','gloveC');c('shoe','boot');c('sole','sole');
  if(o.brow)n.brow=o.brow==='thin'?'Eyebrows_Female':'Eyebrows_Regular';if(o.ear==='cauli')n.face='Brawler';
  if(isFinite(+o.weight))n.fat=+o.weight;if(isFinite(+o.muscle))n.mus=0.4+0.55*(+o.muscle);
  if(isFinite(+o.shortLen))n.bottom=o.shortLen>0.35?'u_shorts_long':'';if(o.boot)n.feet=o.boot==='high'?'u_boots':o.boot==='low'?'low':'mid';return n;}
/* anything from outside (storage, the other player, old saves) is checked field by field */
function clean(o,base){const out=Object.assign({},base||BASE);if(!o||typeof o!=='object'||!MD())return out;if('cut' in o&&!('hairC' in o))o=fromOld(o);
  const col=k=>{if(typeof o[k]==='string'&&HEX.test(o[k]))out[k]=o[k];},num=(k,a,b)=>{const v=+o[k];if(o[k]!=null&&isFinite(v))out[k]=Math.min(b,Math.max(a,v));};
  ['hairC','eye','skin','trunk','trim','topC','gloveC','wrapC','boot','sole'].forEach(col);num('mus',0,1);num('fat',-1,1);
  for(const k in OPT)if(OPT[k].includes(o[k]))out[k]=o[k];if(typeof o.hair==='string'&&HAIRS().includes(o.hair))out.hair=o.hair;return out;}
function mine(){try{const s=localStorage.getItem('sp.look');return s?clean(JSON.parse(s),BASE):null;}catch(e){return null;}}
function save(l){try{localStorage.setItem('sp.look',JSON.stringify(l));}catch(e){}}
function forget(){try{localStorage.removeItem('sp.look');}catch(e){}}
function shapeWeights(l){const m=l.mus-0.5,lean=Math.max(0,-l.fat),heavy=Math.max(0,l.fat),w={};FACES.forEach(f=>{w['Face: '+f]=l.face===f?1:0;});
  w['Body: muscle mass']=m;w['Body: definition']=Math.max(-0.6,Math.min(1.3,m*(1-0.85*heavy)+0.35*lean*(0.4+Math.max(0,m))));w['Body: lean']=lean;w['Body: heavy']=heavy;return w;}

/* ---------- parts: decoded once, loaded on demand ---------- */
const dec=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
const RAW={},DATA={},LOADING={},WAIT=new Set();
function partData(id){if(DATA[id])return DATA[id];const p=RAW[id]||MD().parts.find(x=>x.id===id);if(!p)return null;
  const pos=Float32Array.from(dec(p.pos,Int16Array),v=>v/20),nor=Float32Array.from(dec(p.nor,Int8Array),v=>v/127);
  const d={p,pos,nor,si:Uint16Array.from(dec(p.si,Uint8Array)),sw:Float32Array.from(dec(p.sw,Uint8Array),v=>v/255),ind:dec(p.ind,p.i32?Uint32Array:Uint16Array),
    role:p.role?dec(p.role,Uint8Array):null,bp:p.bp?Float32Array.from(dec(p.bp,Int16Array),v=>v/20):null,morphs:{}};
  for(const [n,m] of Object.entries(p.morphs||{}))d.morphs[n]={i:dec(m.i,Uint16Array),d:Float32Array.from(dec(m.d,Int16Array),v=>v/100)};
  // points that share a place (UV seams): their normals are averaged after a shape change, so no seams show
  const key=new Map(),grp=new Int32Array(p.nv);for(let i=0;i<p.nv;i++){const k=Math.round(pos[i*3]*20)+','+Math.round(pos[i*3+1]*20)+','+Math.round(pos[i*3+2]*20);let g=key.get(k);if(g===undefined){g=key.size;key.set(k,g);}grp[i]=g;}
  d.grp=grp;d.ng=key.size;return DATA[id]=d;}
function need(id){if(DATA[id]||RAW[id]||MD().parts.find(x=>x.id===id))return true;
  if(!LOADING[id]){LOADING[id]=fetch('assets/models/superhero/'+id+'.json?v='+CONFIG.version).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();})
    .then(j=>{RAW[id]=j;WAIT.forEach(b=>{b.kParts='';apply(b,b.look,b.lookWraps);});}).catch(e=>{console.warn('Look part not loaded:',id,e);});}
  return false;}

/* ---------- materials ---------- */
const OUT_HIDE=new THREE.MeshBasicMaterial({visible:false});
function kitMat(l){const P=MD().paint,u={uSkin:{value:new THREE.Color(l.skin)},uTrunk:{value:new THREE.Color(l.trunk)},uTrim:{value:new THREE.Color(l.trim)},uBoot:{value:new THREE.Color(l.boot)},uSole:{value:new THREE.Color(l.sole)},
    uWT:{value:P.wt},uTB:{value:P.tb},uBT:{value:l.feet==='low'?10:P.bt},uTrunkOn:{value:l.bottom?0:1},uBootOn:{value:l.feet==='low'||l.feet==='mid'?1:0}};
  const m=toon(0xffffff,{skinning:true});m.userData.u=u;
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
    sh.vertexShader='attribute vec3 aBP;\nvarying vec3 vBP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vBP = aBP;');
    sh.fragmentShader='varying vec3 vBP;\nuniform vec3 uSkin,uTrunk,uTrim,uBoot,uSole;uniform float uWT,uTB,uBT,uTrunkOn,uBootOn;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 pc=uSkin;float y=vBP.y;
      if(uTrunkOn>0.5&&abs(vBP.x)<=24.0&&y<uWT&&y>uTB){pc=(y>uWT-4.5||(y<uTB+3.2&&y>uTB+1.4))?uTrim:uTrunk;}
      if(uBootOn>0.5&&y<uBT){pc=y<2.2?uSole:(y>uBT-2.0?uTrim:uBoot);}
      diffuseColor.rgb*=pc;`);};
  m.customProgramCacheKey=()=>'spkit';return m;}
function setKit(m,l){const u=m.userData.u,P=MD().paint;u.uSkin.value.set(l.skin);u.uTrunk.value.set(l.trunk);u.uTrim.value.set(l.trim);u.uBoot.value.set(l.boot);u.uSole.value.set(l.sole);
  u.uBT.value=l.feet==='low'?10:P.bt;u.uTrunkOn.value=l.bottom?0:1;u.uBootOn.value=l.feet==='low'||l.feet==='mid'?1:0;}
function roleColor(l,role,wraps){const c=new THREE.Color();switch(role){
  case 'skin':return c.set(l.skin);case 'hair':return c.set(l.hairC);case 'brow':return c.set(l.hairC).multiplyScalar(0.8);case 'shaved':return c.set(l.skin).lerp(new THREE.Color(l.hairC),0.45);
  case 'trunk':return c.set(l.trunk);case 'trim':return c.set(l.trim);case 'boot':return c.set(l.boot);case 'sole':return c.set(l.sole);case 'top':return c.set(l.topC);
  case 'glove':case 'gear':return c.set(l.gloveC);case 'wrap':return c.set(wraps||l.wrapC);case 'eyeW':return c.set('#f4f1ea');case 'iris':return c.set(l.eye);case 'pupil':return c.set('#050505');
  default:return c.set('#808080');}}

/* ---------- one boxer's parts ---------- */
function partsFor(l,wraps){const hands=wraps?'u_wraps':l.hands,keepHair=!l.gear||['','Hair_Buzzed','g_crew','g_cornrows'].includes(l.hair);
  return ['body','eyes',l.brow,keepHair?l.hair:'',l.beard,l.bottom,l.top,l.feet==='u_boots'?'u_boots':'',hands,l.gear].filter(Boolean);}
function buildMesh(b,id){const d=partData(id);if(!d)return null;const p=d.p,g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(d.pos.slice(),3));g.setAttribute('normal',new THREE.BufferAttribute(d.nor.slice(),3));
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(d.si,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(d.sw,4));g.setIndex(new THREE.BufferAttribute(d.ind,1));
  if(d.bp)g.setAttribute('aBP',new THREE.BufferAttribute(d.bp,3));if(d.role)g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(p.nv*3),3));
  (p.groups||[]).forEach(([s0,c,m])=>g.addGroup(s0,c,m));
  let mats;if(id==='body')mats=[kitMat(b.look)];else if(d.role)mats=[toon(0xffffff,{vertexColors:true,skinning:true})];
  else if(p.mats)mats=p.mats.map(()=>toon(0xffffff,{skinning:true}));else mats=[toon(0xffffff,{skinning:true})];
  const mesh=new THREE.SkinnedMesh(g,mats.length>1?mats:mats[0]);mesh.castShadow=true;mesh.frustumCulled=false;mesh.bind(b.skeleton,new THREE.Matrix4());
  const ink=p.slot==='eyes'||p.slot==='brow'?null:new THREE.SkinnedMesh(g,OUTLINE_SKIN);if(ink){ink.frustumCulled=false;ink.bind(b.skeleton,new THREE.Matrix4());}
  b.skel.add(mesh);if(ink)b.skel.add(ink);return {id,d,g,mesh,ink,mats,kS:''};}
function shapeMesh(e,w){const d=e.d,P=e.g.attributes.position.array,N=e.g.attributes.normal.array;let any=false;P.set(d.pos);
  for(const [n,m] of Object.entries(d.morphs)){const k=w[n]||0;if(!k)continue;any=true;for(let j=0;j<m.i.length;j++){const o=m.i[j]*3;P[o]+=m.d[j*3]*k;P[o+1]+=m.d[j*3+1]*k;P[o+2]+=m.d[j*3+2]*k;}}
  e.g.attributes.position.needsUpdate=true;
  if(!any){N.set(d.nor);}else{e.g.computeVertexNormals();const acc=new Float32Array(d.ng*3);for(let i=0;i<d.p.nv;i++){const g=d.grp[i]*3;acc[g]+=N[i*3];acc[g+1]+=N[i*3+1];acc[g+2]+=N[i*3+2];}
    for(let i=0;i<d.p.nv;i++){const g=d.grp[i]*3,L=Math.hypot(acc[g],acc[g+1],acc[g+2])||1;N[i*3]=acc[g]/L;N[i*3+1]=acc[g+1]/L;N[i*3+2]=acc[g+2]/L;}}
  e.g.attributes.normal.needsUpdate=true;}
function paintMesh(e,l,wraps){const d=e.d,p=d.p;
  if(e.id==='body'){setKit(e.mats[0],l);return;}
  if(d.role){const R=MD().roles,C=e.g.attributes.color.array,cache=R.map(r=>roleColor(l,r,wraps));for(let i=0;i<p.nv;i++){const k=cache[d.role[i]];C[i*3]=k.r;C[i*3+1]=k.g;C[i*3+2]=k.b;}e.g.attributes.color.needsUpdate=true;return;}
  if(p.mats){p.mats.forEach((m,i)=>e.mats[i].color.copy(roleColor(l,m.role,wraps)));return;}
  e.mats[0].color.copy(roleColor(l,p.slot==='brow'?'brow':'hair',wraps));}
/* put a look on a boxer; only what changed is redone */
function apply(b,look,wraps){if(!b||!b.ue)return 0;const l=clean(look,BASE);b.look=l;b.lookWraps=wraps||null;
  const ids=partsFor(l,wraps),kp=ids.join('|');
  if(b.kParts!==kp){let missing=false;for(const id of ids)if(!need(id))missing=true;
    if(missing)WAIT.add(b);else WAIT.delete(b);
    for(const id of Object.keys(b.parts))if(!ids.includes(id)){const e=b.parts[id];b.skel.remove(e.mesh);if(e.ink)b.skel.remove(e.ink);e.g.dispose();e.mats.forEach(m=>m.dispose());delete b.parts[id];}
    for(const id of ids)if(!b.parts[id]&&(DATA[id]||RAW[id]||MD().parts.find(x=>x.id===id))){const e=buildMesh(b,id);if(e)b.parts[id]=e;}
    b.kParts=missing?'':kp;b.mats=Object.values(b.parts).flatMap(e=>e.mats);}
  const w=shapeWeights(l),kS=JSON.stringify(w);let tris=0;
  for(const e of Object.values(b.parts)){if(e.kS!==kS){e.kS=kS;shapeMesh(e,w);}paintMesh(e,l,wraps);tris+=e.d.ind.length/3;}
  return tris;}
/* ---------- in fights: the gloves go exactly where the fight's skeleton has them ---------- */
const aT=new V3(),aQ=new THREE.Quaternion();
function armsToSim(b){const R=b.ref;if(!R)return;
  for(let i=0;i<NB;i++)R.bones[i].quaternion.copy(b.bones[i].quaternion);R.bones[BIDX.Hips].position.copy(b.hips.position);R.root.updateMatrixWorld(true);
  for(const S of ['Left','Right']){R.bones[BIDX[S+'Hand']].getWorldPosition(aT);const h=b.bones[BIDX[S+'Hand']];h.getWorldQuaternion(aQ);
    legIK(b.bones[BIDX[S+'Arm']],b.bones[BIDX[S+'ForeArm']],h,aT,aQ.clone());}}
return {BASE,CORNER,FACES,OPT,NAMES,PRESETS,HAIRS,label,clean,mine,save,forget,apply,need,armsToSim,shapeWeights};
})();
