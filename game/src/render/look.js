/* South Paw · src/render/look.js
   A fighter's look: haircut, face, build and kit. Set on the Customise screen (src/ui/customise.js), saved on this
   device, sent to the other player online. It works on a character model (makeModelBoxer in boxer.js):
   - kit: every triangle of the body is repainted from the look (shorts, waistband, stripe, wraps, boots, skin);
   - build: points move along their normals by an amount set by their bone (heavier belly, bigger arms...), only
     how he looks: the fight is judged on the shared skeleton, so reach and hit areas stay the same for everyone;
   - hair: the model's own hair is the top of his head (no skin under it), so a scalp is built where it was and new
     cuts are grown from that scalp on a grid of directions around the head;
   - face: eyes in the eye sockets, eyebrows on the brow ridge, a bowl and rim on each ear (or a cauliflower ear).
   Hair, scalp and face pieces hang on the head bone, so they follow every animation.
   The same code, with a free camera, is the standalone fitting room in tools/hairlab.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const LOOK=(()=>{
const DEG=Math.PI/180,HEX=/^#[0-9a-f]{6}$/i;
function sstep(a,b,x){const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);}
/* ---------- the looks ---------- */
const BASE={cut:'original',L:0.5,V:0.5,F:0.5,line:0,hair:'#1b120d',tips:false,tip:'#e8c55a',eye:'#2a1a10',brow:'natural',browHair:true,browCol:'#1b120d',ear:'normal',
  skin:'#d59a6c',weight:0,muscle:0,trunks:'#d8302a',band:'#f4efe4',stripe:false,stripeCol:'#ffc83a',shortLen:0,wraps:'#e0342a',boot:'low',shoe:'#16171c',sole:'#16171c'};
const CORNER=[Object.assign({},BASE),Object.assign({},BASE,{hair:'#15110e',browCol:'#15110e',skin:'#8a5636',trunks:'#1e5bd0',band:'#ffc83a',wraps:'#2b6ef2'})];
const BROWS={natural:{name:'Natural',ang:-6,th:0.62},thick:{name:'Thick',ang:-4,th:0.95},thin:{name:'Thin',ang:-8,th:0.36},angry:{name:'Angry',ang:18,th:0.7},raised:{name:'Raised',ang:-16,th:0.6}};
const EARS={normal:'Normal',cauli:'Cauliflower'},BOOTS={low:0,mid:15,high:27},BOOTN={low:'Low shoes',mid:'Mid boots',high:'High boots'};
/* ---------- the cuts ----------
   Each cut says how thick the hair is at every point of the grid (cm), and can add pieces: spikes, a bun, a ponytail, locks.
   L, V, F are the sliders (length, volume, sides). top/side/front/back describe where on the head a point is. */
const CUTS=[
 {id:'original',name:'His own',note:'The model as it came',len:null},
 {id:'bald',name:'Clean shave',note:'Nothing on top',len:null},
 {id:'buzz',name:'Buzz cut',note:'One guard all over',len:[0.1,1.4,0.6],fade:0.8,t:p=>p.L*(p.top+p.side*(0.35+0.65*p.F))},
 {id:'crew',name:'Crew cut',note:'Short top, tight sides',len:[1.2,5,2.6],fade:0.5,t:p=>p.top*p.L*(1+0.25*p.front)+p.side*(0.15+0.55*p.F)},
 {id:'curly',name:'Curly top',note:'Curls up top, skin fade',len:[2,6,3.4],vol:0.6,fade:0.3,vNote:'How bumpy the curls are',
   t:p=>p.top*(p.L+p.V*1.6*(0.5+0.5*Math.sin(p.th*7+p.ph*11)*Math.sin(p.th*5-p.ph*9)))+p.side*fadeBand(p)},
 {id:'flat',name:'Flat top',note:'Squared off like a deck',len:[3,9,5.5],fade:0.35,t:p=>Math.max(p.side*(0.12+0.5*p.F),p.topish*boxed(p,1.4))},
 {id:'hightop',name:'High-top',note:'A tall block, faded sides',len:[6,15,10],fade:0.2,t:p=>Math.max(p.side*fadeBand(p),p.topish*boxed(p,0.4))},
 {id:'afro',name:'Afro',note:'Round all over',len:[3,10,5.5],vol:0.5,vNote:'Rounder or taller',round:4.5,t:p=>sphere(p)},
 {id:'mohawk',name:'Mohawk',note:'A crest, shaved sides',len:[3,15,8],vol:0.45,fade:0,vNote:'Width of the crest',
   t:p=>{const w=1.4+p.V*3.2,c=1-sstep(w*0.55,w,Math.abs(p.lx));return Math.max(c*p.L*(0.55+0.45*(1-sstep(60*DEG,118*DEG,p.ph))),p.side*0.45*p.F+p.top*0.45*p.F*(1-c));}},
 {id:'faux',name:'Faux hawk',note:'A soft ridge, short sides',len:[2,7,4],vol:0.6,fade:0.5,vNote:'Width of the ridge',
   t:p=>{const w=2.6+p.V*4,c=1-sstep(w*0.5,w,Math.abs(p.lx));return p.top*(0.9+c*p.L*(0.6+0.4*p.front))+p.side*(0.15+0.5*p.F);}},
 {id:'spiky',name:'Spikes',note:'Gelled points up top',len:[2,8,4],vol:0.5,fade:0.5,vNote:'How many spikes',t:p=>p.top*1.1+p.side*(0.12+0.5*p.F),extra:spikes},
 {id:'pomp',name:'Pompadour',note:'Volume at the front',len:[3,10,6],fade:0.35,
   t:p=>p.side*(0.12+0.55*p.F)+p.top*0.9+p.L*Math.exp(-Math.pow((p.ph-38*DEG)/(26*DEG),2))*(0.35+0.65*p.front)*(1-0.7*p.back)},
 {id:'bun',name:'Top knot',note:'Slicked back into a bun',len:[2.5,6,4],fade:0.6,t:p=>p.top*0.8+p.side*(0.15+0.5*p.F),extra:bun},
 {id:'pony',name:'Ponytail',note:'Slicked back, tied low',len:[10,45,26],fade:0.7,t:p=>p.top*0.8+p.side*(0.2+0.5*p.F),extra:pony},
 {id:'dreads',name:'Locks',note:'Dreadlocks to the shoulders',len:[6,38,20],vol:0.5,fade:0.8,vNote:'How many locks',t:p=>p.top*1.1+p.side*(0.3+0.6*p.F),extra:locks},
 {id:'rows',name:'Cornrows',note:'Braided rows, front to back',len:[0.4,1.0,0.65],vol:0.5,fade:1,vNote:'How many rows',t:p=>0.1,extra:rows},
 {id:'part',name:'Side part',note:'Combed over from a part',len:[1.5,6,3.2],fade:0.45,
   t:p=>{const dip=Math.exp(-Math.pow((p.lx-3)/0.7,2))*p.top;const side=p.lx>3?0.75:1.1;return p.top*p.L*side*(1-0.85*dip)+p.side*(0.14+0.55*p.F);}},
 {id:'bowl',name:'Bowl cut',note:'One length, straight fringe',len:[1.5,5,2.8],ownMask:true,t:p=>p.L},
];
const CUTI=Object.fromEntries(CUTS.map(c=>[c.id,c]));
function cutDefaults(look,id){const c=CUTI[id];look.cut=id;if(c.len)look.L=(c.len[2]-c.len[0])/(c.len[1]-c.len[0]);if(c.vol!=null)look.V=c.vol;if(c.fade!=null)look.F=c.fade;return look;}
/* anything that arrives from outside (storage, the other player) is checked field by field */
function clean(o,base){const out=Object.assign({},base);if(!o||typeof o!=='object')return out;
  const num=(k,a,b)=>{const v=+o[k];if(isFinite(v))out[k]=Math.min(b,Math.max(a,v));},col=k=>{if(typeof o[k]==='string'&&HEX.test(o[k]))out[k]=o[k];},bool=k=>{if(typeof o[k]==='boolean')out[k]=o[k];};
  if(typeof o.cut==='string'&&CUTI[o.cut])out.cut=o.cut;num('L',0,1);num('V',0,1);num('F',0,1);num('line',-1,1);num('weight',-1,1);num('muscle',0,1);num('shortLen',-1,1);
  ['hair','tip','eye','browCol','skin','trunks','band','stripeCol','wraps','shoe','sole'].forEach(col);['tips','browHair','stripe'].forEach(bool);
  if(BROWS[o.brow])out.brow=o.brow;if(EARS[o.ear])out.ear=o.ear;if(o.boot in BOOTS)out.boot=o.boot;return out;}
function mine(){try{const s=localStorage.getItem('sp.look');return s?clean(JSON.parse(s),BASE):null;}catch(e){return null;}}
function save(l){try{localStorage.setItem('sp.look',JSON.stringify(l));}catch(e){}}
function forget(){try{localStorage.removeItem('sp.look');}catch(e){}}

/* ---------- the model, measured once (lazily, the first time a look is put on) ---------- */
let MD=null;
function model(base){if(MD)return MD;
  const P=base.attr.position.array,NV=P.length/3,PART=base.part,SI=base.attr.skinIndex.array,TRI=base.index.array;
  const BONE=new Uint8Array(NV);for(let i=0;i<NV;i++)BONE[i]=SI[i*4];
  // one id per distinct point (the mesh repeats a point once per face colour), smoothed normals, neighbours
  const GID=new Int32Array(NV);let NG=0;{const m=new Map();for(let i=0;i<NV;i++){const k=Math.round(P[i*3]*100)+','+Math.round(P[i*3+1]*100)+','+Math.round(P[i*3+2]*100);let g=m.get(k);if(g===undefined){g=NG++;m.set(k,g);}GID[i]=g;}}
  const GN=new Float32Array(NG*3),GB=new Uint8Array(NG),ADJ=Array.from({length:NG},()=>new Set());for(let i=0;i<NV;i++)GB[GID[i]]=BONE[i];
  for(let t=0;t<TRI.length;t+=3){const a=TRI[t],b=TRI[t+1],c=TRI[t+2];
    const ax=P[b*3]-P[a*3],ay=P[b*3+1]-P[a*3+1],az=P[b*3+2]-P[a*3+2],bx=P[c*3]-P[a*3],by=P[c*3+1]-P[a*3+1],bz=P[c*3+2]-P[a*3+2];
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;for(const v of [a,b,c]){const g=GID[v];GN[g*3]+=nx;GN[g*3+1]+=ny;GN[g*3+2]+=nz;}
    const ga=GID[a],gb=GID[b],gc=GID[c];ADJ[ga].add(gb).add(gc);ADJ[gb].add(ga).add(gc);ADJ[gc].add(ga).add(gb);}
  for(let g=0;g<NG;g++){const l=Math.hypot(GN[g*3],GN[g*3+1],GN[g*3+2])||1;GN[g*3]/=l;GN[g*3+1]/=l;GN[g*3+2]/=l;}
  // corners in draw order: body triangles first, then the model's own hair
  const BV=[],HV=[];for(let t=0;t<TRI.length;t+=3)(PART[TRI[t]]===3?HV:BV).push(TRI[t],TRI[t+1],TRI[t+2]);
  let HEM=1e9;for(let i=0;i<NV;i++)if(PART[i]===1&&(BONE[i]===14||BONE[i]===18))HEM=Math.min(HEM,P[i*3+1]);
  const HB=BIDX.Head,hr=SP_MODELS[MODEL_NAME].rest[HB];
  const HEADINV=new THREE.Matrix4().compose(new V3().fromArray(hr.p),new THREE.Quaternion().fromArray(hr.q),new V3(1,1,1)).invert();
  MD={P,NV,PART,BONE,TRI,GID,NG,GN,GB,ADJA:ADJ.map(s=>[...s]),CV:BV.concat(HV),nBody:BV.length,HEM,HB,HEADINV,scalp:null,face:null};return MD;}
/* a fresh draw geometry for one boxer: every corner its own vertex (flat facets), so it can be reshaped and repainted */
function geometry(base){const M=model(base),n=M.CV.length,g=new THREE.BufferGeometry(),si=base.attr.skinIndex.array,sw=base.attr.skinWeight.array;
  const pos=new Float32Array(n*3),six=new Uint16Array(n*4),swt=new Float32Array(n*4);
  for(let k=0;k<n;k++){const v=M.CV[k];pos.set(M.P.subarray(v*3,v*3+3),k*3);for(let j=0;j<4;j++){six[k*4+j]=si[v*4+j];swt[k*4+j]=sw[v*4+j];}}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('skinIndex',new THREE.BufferAttribute(six,4));g.setAttribute('skinWeight',new THREE.BufferAttribute(swt,4));
  g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3),3));g.computeVertexNormals();
  g.addGroup(0,M.nBody,0);g.addGroup(M.nBody,n-M.nBody,1);return g;}

/* ---------- build ---------- */
const FIXED=new Set([5,9,13,16,17,20,21]);   // head, hands, feet: never reshaped, so hair and wraps still fit
function shapeOf(b,nz,W,Mu){const h=Math.max(0,W)*1.7,t=Math.max(0,-W)*1.5,f=Math.max(0,nz);Mu*=1.5;
  switch(b){case 0:return 2.0*h-0.8*t+2.2*h*f;case 1:return 2.4*h-0.9*t+4.6*h*f+0.3*Mu;case 2:return 2.1*h-0.9*t+3.2*h*f+0.9*Mu;
    case 3:return 1.5*h-0.8*t+Mu*(1.0+1.2*f);case 4:return 1.1*h-0.4*t+0.8*Mu;case 6:case 10:return 1.1*h-0.5*t+1.9*Mu;
    case 7:case 11:return 1.3*h-0.7*t+1.6*Mu;case 8:case 12:return 0.5*h-0.45*t+0.7*Mu;case 14:case 18:return 1.9*h-0.9*t+1.1*Mu;
    case 15:case 19:return 0.8*h-0.5*t+0.8*Mu;default:return 0;}}
function shape(b,l){const M=MD,OFF=new Float32Array(M.NG);
  if(l.weight||l.muscle){for(let g=0;g<M.NG;g++)OFF[g]=FIXED.has(M.GB[g])?0:shapeOf(M.GB[g],M.GN[g*3+2],l.weight,l.muscle);
    for(let pass=0;pass<4;pass++){const o=OFF.slice();for(let g=0;g<M.NG;g++){if(M.GB[g]===M.HB)continue;let s=o[g]*2,n=2;for(const a of M.ADJA[g]){s+=o[a];n++;}OFF[g]=s/n;}}}
  const Pa=b.geo.attributes.position.array;
  for(let k=0;k<M.CV.length;k++){const v=M.CV[k],g=M.GID[v],o=OFF[g];Pa[k*3]=M.P[v*3]+M.GN[g*3]*o;Pa[k*3+1]=M.P[v*3+1]+M.GN[g*3+1]*o;Pa[k*3+2]=M.P[v*3+2]+M.GN[g*3+2]*o;}
  b.geo.attributes.position.needsUpdate=true;b.geo.computeVertexNormals();}
/* ---------- kit: one colour per triangle, judged at its middle, so hems and boot tops stay crisp ---------- */
const cP=new THREE.Color();
function paint(b,l,wraps){const M=MD,col=b.geo.attributes.color.array,hem=M.HEM-l.shortLen*13,boot=BOOTS[l.boot],P=M.P,GN=M.GN,GID=M.GID;
  const pick=(v,y,nx,x)=>{const p=M.PART[v],bn=M.BONE[v];
    const leg=bn===15||bn===19,thigh=bn===14||bn===18,stripe=l.stripe&&Math.abs(nx)>0.72&&nx*x>0;
    if(p===6||(boot&&leg&&y<boot&&p===0))return y<1.7?l.sole:l.shoe;
    if(p===1)return y<hem?l.skin:stripe?l.stripeCol:l.trunks;
    if(p===0&&thigh&&y>=hem)return stripe?l.stripeCol:l.trunks;
    if(p===2)return wraps||l.wraps;if(p===4||p===5)return l.band;if(p===3)return l.hair;
    return l.skin;};
  for(let k=0;k<M.CV.length;k+=3){const a=M.CV[k],c=M.CV[k+1],d=M.CV[k+2],y=(P[a*3+1]+P[c*3+1]+P[d*3+1])/3,x=(P[a*3]+P[c*3]+P[d*3])/3,nx=(GN[GID[a]*3]+GN[GID[c]*3]+GN[GID[d]*3])/3;
    cP.set(pick(a,y,nx,x));for(let q=0;q<3;q++){col[(k+q)*3]=cP.r;col[(k+q)*3+1]=cP.g;col[(k+q)*3+2]=cP.b;}}
  b.geo.attributes.color.needsUpdate=true;}

/* ---------- measuring his scalp ----------
   From a point inside the skull, rays go out on a grid of directions (around the head and from the crown down).
   Each ray finds the skin and the outside of his original hair: that gives the head shape and his natural hairline. */
const NT=48,NP=24,PHIMAX=128*DEG;
const dirOf=(th,ph,out)=>out.set(Math.sin(ph)*Math.sin(th),Math.cos(ph),Math.sin(ph)*Math.cos(th));
function scalp(){const M=MD;if(M.scalp)return M.scalp;
  const P=M.P,headIdx=[],hairIdx=[];for(let t=0;t<M.TRI.length;t+=3){const a=M.TRI[t];if(M.PART[a]===0&&M.BONE[a]===M.HB)headIdx.push(a,M.TRI[t+1],M.TRI[t+2]);if(M.PART[a]===3)hairIdx.push(a,M.TRI[t+1],M.TRI[t+2]);}
  const mk=idx=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setIndex(idx);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.updateMatrixWorld();return m;};
  const headMesh=mk(headIdx),origHit=mk(hairIdx);
  const hb=new THREE.Box3();for(const i of headIdx)hb.expandByPoint(new V3(P[i*3],P[i*3+1],P[i*3+2]));
  const C=new V3(0,hb.min.y+(hb.max.y-hb.min.y)*0.58,(hb.min.z+hb.max.z)/2-1.5);
  const SC=new Float32Array(NT*NP),M0=new Float32Array(NT*NP),SYN=new Uint8Array(NT*NP),DEPTH=new Float32Array(NT*NP),O=new Float32Array(NT*NP);
  const ray=new THREE.Raycaster();ray.near=1.5;ray.far=60;const d=new V3();
  for(let i=0;i<NT;i++)for(let j=0;j<NP;j++){const k=i*NP+j;dirOf(i/NT*Math.PI*2,j/(NP-1)*PHIMAX,d);ray.set(C,d);
    const hs=ray.intersectObject(headMesh,false),ho=ray.intersectObject(origHit,false);SC[k]=hs.length?hs[0].distance:-1;O[k]=ho.length?ho[ho.length-1].distance:-1;M0[k]=O[k]>0?1:0;}
  const bfs=seed=>{const st=new Float32Array(NT*NP).fill(99),q=[];for(let k=0;k<st.length;k++)if(seed(k)){st[k]=0;q.push(k);}
    for(let h=0;h<q.length;h++){const k=q[h],i=(k/NP)|0,j=k%NP;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const jj=j+dj;if(jj<0||jj>=NP)continue;const n=((i+di+NT)%NT)*NP+jj;if(st[n]>st[k]+1){st[n]=st[k]+1;q.push(n);}}}return st;};
  const step=bfs(k=>!M0[k]||SC[k]>0),st=bfs(k=>!M0[k]);for(let k=0;k<st.length;k++)DEPTH[k]=Math.min(st[k],8);
  // no skin under his hair: a scalp from the hair's shape, sunk in further toward the middle
  for(let k=0;k<SC.length;k++)if(SC[k]<0&&O[k]>0){SC[k]=O[k]-Math.min(1.6,0.5*step[k]);SYN[k]=1;}
  for(let i=0;i<NT;i++)for(let j=0;j<NP;j++){const k=i*NP+j;if(SC[k]<0)SC[k]=j?SC[k-1]:10;}
  for(let pass=0;pass<3;pass++){const tmp=SC.slice();for(let i=0;i<NT;i++)for(let j=1;j<NP-1;j++){const k=i*NP+j;if(!SYN[k])continue;const a=((i+NT-1)%NT)*NP+j,b=((i+1)%NT)*NP+j;SC[k]=(tmp[a]+tmp[b]+tmp[k-1]+tmp[k+1]+tmp[k]*2)/6;}}
  let pole=0;for(let i=0;i<NT;i++)pole+=SC[i*NP];for(let i=0;i<NT;i++)SC[i*NP]=pole/NT;
  const m=M0.slice();for(let i=0;i<NT;i++)for(let j=1;j<NP-1;j++){const a=((i+NT-1)%NT)*NP+j,b=((i+1)%NT)*NP+j;M0[i*NP+j]=(m[a]+m[b]+m[i*NP+j]*2)/4;}
  // eyes: the deepest point under the brow ridge; ears: the widest points of the head
  const face={};const r=new THREE.Raycaster();r.near=0.5;r.far=40;
  for(const side of [1,-1]){let best=null;for(let y=168.5;y<=174;y+=0.25){r.set(new V3(3.3*side,y,C.z),new V3(0,0,1));const h=r.intersectObject(headMesh,false)[0];if(h&&(!best||h.point.z<best.point.z))best=h;}
    face['eye'+side]=best?{p:best.point.clone(),n:best.face.normal.clone()}:{p:new V3(3.3*side,171,14),n:new V3(0,0,1)};}
  let mx=0;for(const i of headIdx)mx=Math.max(mx,Math.abs(P[i*3]));
  for(const side of [1,-1]){const c=new V3();let n=0;for(const i of headIdx){const x=P[i*3];if(x*side>mx-1.6){c.x+=x;c.y+=P[i*3+1];c.z+=P[i*3+2];n++;}}
    c.divideScalar(Math.max(1,n));c.x=side*(mx+0.02);face['ear'+side]={p:c,n:new V3(side,0,-0.15).normalize()};}
  M.scalp={C,SC,M0,SYN,DEPTH,scalpTop:SC[0],face};return M.scalp;}
const H={};   // the scalp of the cut being built (filled by grow)
function fadeBand(p){return 0.5*p.F*(1-sstep(82*DEG,112*DEG,p.ph))+0.12*(1-sstep(95*DEG,118*DEG,p.ph));}
function sc(th,ph){const SC=H.SC;let i=(th/(Math.PI*2))*NT;i=((i%NT)+NT)%NT;let j=Math.min(NP-1.001,Math.max(0,ph/PHIMAX*(NP-1)));
  const i0=Math.floor(i),i1=(i0+1)%NT,j0=Math.floor(j),j1=j0+1,u=i-i0,v=j-j0;return (SC[i0*NP+j0]*(1-u)+SC[i1*NP+j0]*u)*(1-v)+(SC[i0*NP+j1]*(1-u)+SC[i1*NP+j1]*u)*v;}
function maskAt(th,ph){const D=H.DEPTH;let i=(th/(Math.PI*2))*NT;i=((i%NT)+NT)%NT;let j=Math.min(NP-1.001,Math.max(0,ph/PHIMAX*(NP-1)));
  const i0=Math.floor(i),i1=(i0+1)%NT,j0=Math.floor(j),j1=j0+1,u=i-i0,v=j-j0,D2=k=>Math.min(1,D[k]/2);return (D2(i0*NP+j0)*(1-u)+D2(i1*NP+j0)*u)*(1-v)+(D2(i0*NP+j1)*(1-u)+D2(i1*NP+j1)*u)*v;}
function boxed(p,inset){const C=H.C,yTop=C.y+H.scalpTop+p.L,cy=Math.cos(p.ph),sy=Math.sin(p.ph);const rp=cy>0.02?(yTop-C.y)/cy:1e9;const half=sc(p.th,90*DEG)+inset;const rb=sy>0.02?half/sy:1e9;return Math.max(0,Math.min(rp,rb)-p.s);}
function sphere(p){const S=new V3(0,3+p.V*4,-1.5),R=H.scalpTop+p.L*(0.62+0.22*(1-p.V)),d=p.d;
  const ox=-S.x,oy=-S.y,oz=-S.z,b=d.x*ox+d.y*oy+d.z*oz,c=ox*ox+oy*oy+oz*oz-R*R,disc=b*b-c;return disc>0?Math.max(0.4,-b+Math.sqrt(disc)-p.s):0.4;}
/* pieces made of tubes and blobs; ctr is a point inside each piece so its faces point outward */
function tube(pts,radii,sides,X,colAt){const rings=[];const up=new V3(0,1,0),t=new V3(),u=new V3(),w=new V3();
  for(let k=0;k<pts.length;k++){t.subVectors(pts[Math.min(k+1,pts.length-1)],pts[Math.max(0,k-1)]).normalize();u.crossVectors(t,Math.abs(t.y)>0.9?new V3(1,0,0):up).normalize();w.crossVectors(t,u);
    const r=[];for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2;r.push(pts[k].clone().addScaledVector(u,Math.cos(a)*radii[k]).addScaledVector(w,Math.sin(a)*radii[k]).toArray());}rings.push(r);}
  for(let k=0;k<pts.length-1;k++){const ctr=pts[k].clone().lerp(pts[k+1],0.5),ca=colAt(k/(pts.length-1)).clone(),cb=colAt((k+1)/(pts.length-1)).clone();
    for(let s=0;s<sides;s++){const s2=(s+1)%sides;X.push(rings[k][s],rings[k][s2],rings[k+1][s2],ca,ca,cb,ctr);X.push(rings[k][s],rings[k+1][s2],rings[k+1][s],ca,cb,cb,ctr);}}
  const end=pts[pts.length-1],last=rings[rings.length-1],ce=colAt(1).clone(),ctr=pts[pts.length-2].clone().lerp(end,0.5);
  for(let s=0;s<sides;s++)X.push(last[s],last[(s+1)%sides],end.toArray(),ce,ce,ce,ctr);}
function mixC(o,k){return o.base.clone().lerp(o.tipC,sstep(0.45,1,k));}
function spikes(o){const n=Math.round(20+o.V*34),gold=137.5*DEG;
  for(let k=0;k<n;k++){const f=(k+0.5)/n,ph=Math.acos(1-f*(1-Math.cos(84*DEG))),th=k*gold;
    if(o.mask(th,ph)<0.7)continue;const b=o.surf(th,ph),dir=o.d.clone().normalize();dir.y+=0.55;dir.z+=0.25;dir.normalize();
    const h=o.L*(0.75+0.35*Math.sin(k*12.9898)%1+0.15),tip=b.clone().addScaledVector(dir,h),mid=b.clone().addScaledVector(dir,h*0.45);
    tube([b.clone().addScaledVector(dir,-0.6),mid,tip],[1.5,0.85,0.05],5,o,q=>mixC(o,q));}}
function bun(o){const c=o.surf(Math.PI,46*DEG),dir=o.d.clone().normalize(),R=o.L;c.addScaledVector(dir,R*0.55);
  const g=new THREE.IcosahedronGeometry(R,1).toNonIndexed(),p=g.attributes.position,col=o.base.clone();
  for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(k=>[c.x+p.getX(i+k),c.y+p.getY(i+k)*0.85,c.z+p.getZ(i+k)]);o.push(v[0],v[1],v[2],col,col,col,c);}
  const band=[];for(let k=0;k<3;k++)band.push(o.surf(Math.PI,46*DEG).addScaledVector(dir,R*0.15*k));tube(band,[R*0.42,R*0.45,R*0.42],7,o,()=>o.base.clone().multiplyScalar(0.55));}
function pony(o){const p0=o.surf(Math.PI,74*DEG),pts=[p0.clone().add(new V3(0,0,1))];const step=o.L/8;let d=new V3(0,-0.25,-1).normalize();
  for(let k=1;k<=8;k++){d.lerp(new V3(0,-1,-0.18).normalize(),0.32).normalize();pts.push(pts[k-1].clone().addScaledVector(d,k===1?2.2:step));}
  tube(pts,pts.map((_,k)=>k===0?1.9:Math.max(0.5,2.3*(1-k/9))),6,o,q=>mixC(o,q));
  tube([p0.clone().add(new V3(0,0,0.4)),p0.clone().add(new V3(0,-0.3,-1.6))],[2.0,2.0],7,o,()=>o.base.clone().multiplyScalar(0.5));}
function rows(o){const n=Math.round(6+o.V*6),d=new V3();
  for(let r=0;r<n;r++){const k=(r/(n-1)*2-1)*0.78,rr=Math.sqrt(1-k*k);const pts=[],rad=[];
    for(let bdeg=80;bdeg>=-130;bdeg-=7){const b=bdeg*DEG;d.set(k,rr*Math.cos(b),rr*Math.sin(b)).normalize();const ph=Math.acos(d.y),th=Math.atan2(d.x,d.z);
      if(o.mask(th,ph)<0.55){if(pts.length)break;continue;}
      pts.push(H.C.clone().addScaledVector(d,sc(th,ph)+o.L*0.55));rad.push(pts.length%2?o.L:o.L*0.72);}
    if(pts.length>2)tube(pts,rad,4,o,q=>mixC(o,q));}}
function locks(o){const n=Math.round(16+o.V*24),gold=137.5*DEG;let left=n;
  for(let k=0;k<n*3&&k<200;k++){const f=(k*0.618)%1,ph=(36+f*56)*DEG,th=Math.PI+((k*gold)%(Math.PI*2)-Math.PI)*0.6;   // the back half, behind the ears
    if(o.mask(th,ph)<0.85)continue;if(--left<0)break;
    const side=Math.max(0,Math.cos(th)+0.5),len=o.L*(1-0.45*side)*(0.85+0.15*Math.sin(k*3.7));
    const b=o.surf(th,ph),out=o.d.clone().normalize();const pts=[b.clone().addScaledVector(out,-0.5)];let dir=out.clone();const seg=len/6;
    const fall=new V3(out.x*0.3,-1,out.z*0.3-0.3).normalize();
    for(let s=1;s<=6;s++){dir.lerp(fall,0.42).normalize();pts.push(pts[s-1].clone().addScaledVector(dir,s===1?1.2:seg));}
    tube(pts,pts.map((_,s)=>s===6?0.5:0.95-s*0.05),5,o,q=>mixC(o,q));}}
/* the hair of one cut, and the scalp under it, as geometry in the bind pose (cm) */
const cA=new THREE.Color(),cB=new THREE.Color(),cS=new THREE.Color(),cT=new THREE.Color();
function grow(l){const s=scalp();Object.assign(H,s);const C=s.C,SC=s.SC,cut=CUTI[l.cut];const pos=[],col=[];let tris=0;
  const push=(a,b,c,ca,cb,cc,ctr)=>{const ab=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],ac=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],g=[(a[0]+b[0]+c[0])/3-ctr.x,(a[1]+b[1]+c[1])/3-ctr.y,(a[2]+b[2]+c[2])/3-ctr.z];
    if(n[0]*g[0]+n[1]*g[1]+n[2]*g[2]<0){const x=b;b=c;c=x;const y=cb;cb=cc;cc=y;}
    pos.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);col.push(ca.r,ca.g,ca.b,cb.r,cb.g,cb.b,cc.r,cc.g,cc.b);tris++;};
  const d=new V3();
  // the scalp where the model had hair, in skin colour
  const cap=[],capC=[];cS.set(l.skin);
  {const Pt=(i,j)=>{const k=(i%NT)*NP+j;dirOf((i%NT)/NT*Math.PI*2,j/(NP-1)*PHIMAX,d);const r=SC[k]-(s.SYN[k]?0:0.25);return [C.x+d.x*r,C.y+d.y*r,C.z+d.z*r];};
    const pushCap=(a,b,c)=>{const ab=new V3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),ac=new V3(c[0]-a[0],c[1]-a[1],c[2]-a[2]),n=ab.cross(ac),g=new V3((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3).sub(C);
      const t=n.dot(g)<0?[a,c,b]:[a,b,c];for(const v of t){cap.push(v[0],v[1],v[2]);capC.push(cS.r,cS.g,cS.b);}};
    for(let i=0;i<NT;i++)for(let j=0;j<NP-1;j++){if(![i*NP+j,((i+1)%NT)*NP+j,((i+1)%NT)*NP+j+1,i*NP+j+1].some(k=>s.SYN[k]))continue;
      const a=Pt(i,j),b=Pt(i+1,j),e=Pt(i+1,j+1),f=Pt(i,j+1);if(j>0)pushCap(a,b,e);pushCap(a,e,f);}}
  if(cut.t){const L=cut.len[0]+(cut.len[1]-cut.len[0])*l.L,V=l.V,F=l.F;cA.set(l.hair);cT.set(l.tip);
    const T=new Float32Array(NT*NP),Mk=new Float32Array(NT*NP);let tMax=0.01;
    for(let i=0;i<NT;i++)for(let j=0;j<NP;j++){const th=i/NT*Math.PI*2,ph=j/(NP-1)*PHIMAX;dirOf(th,ph,d);const sr=SC[i*NP+j];
      let m;if(cut.ownMask){const y=C.y+d.y*sr,line=C.y+1.8+l.line*3;m=sstep(line-0.8,line+0.8,y);}
      else{const shift=l.line*13*DEG*(0.35+0.65*Math.max(0,Math.cos(th)));const jj=Math.min(NP-1,Math.max(0,j+shift/(PHIMAX/(NP-1))));const j0=Math.floor(jj),j1=Math.min(NP-1,j0+1),f=jj-j0;m=s.M0[i*NP+j0]*(1-f)+s.M0[i*NP+j1]*f;}
      const top=1-sstep(42*DEG,82*DEG,ph),topish=1-sstep(55*DEG,88*DEG,ph),depth=s.DEPTH[i*NP+j],edge=sstep(0,cut.round||2,depth);
      const p={th,ph,d,s:sr,L,V,F,edge,depth,top,side:1-top,topish,front:Math.max(0,Math.cos(th)),back:Math.max(0,-Math.cos(th)),lx:sr*d.x,dx:d.x,dy:d.y};
      const t=Math.max(0,cut.t(p))*(cut.ownMask?1:0.4+0.6*edge);T[i*NP+j]=t;Mk[i*NP+j]=m;if(m>0.5)tMax=Math.max(tMax,t);}
    let a=0;for(let i=0;i<NT;i++)a+=T[i*NP];for(let i=0;i<NT;i++)T[i*NP]=a/NT;   // the crown is one point
    const V3s=[];for(let i=0;i<NT;i++)for(let j=0;j<NP;j++){const k=i*NP+j;dirOf(i/NT*Math.PI*2,j/(NP-1)*PHIMAX,d);const t=T[k],m=Mk[k];
      const lift=m*(t-0.35*(1-sstep(0.02,0.14,t)))+(1-m)*-0.45;   // uncovered or shaved: tucked just under the skin
      V3s[k]=[C.x+d.x*(SC[k]+lift),C.y+d.y*(SC[k]+lift),C.z+d.z*(SC[k]+lift),t,m];}
    const colOf=(t,h)=>{const dens=sstep(0.03,0.75,t);cB.copy(cS).lerp(cA,0.3+0.7*dens);if(l.tips&&h>0.55)cB.lerp(cT,sstep(0.55,1,h));return cB.clone();};
    const cc=v=>colOf(v[3],v[3]/tMax);
    for(let i=0;i<NT;i++)for(let j=0;j<NP-1;j++){const i2=(i+1)%NT,A=V3s[i*NP+j],B=V3s[i2*NP+j],Cc=V3s[i2*NP+j+1],E=V3s[i*NP+j+1];
      if(Math.max(A[4],B[4],Cc[4],E[4])<0.04)continue;if(j>0)push(A,B,Cc,cc(A),cc(B),cc(Cc),C);push(A,Cc,E,cc(A),cc(Cc),cc(E),C);}
    if(cut.extra){const solid=cA.clone(),surf=(th,ph)=>{dirOf(th,ph,d);const i=Math.round(th/(Math.PI*2)*NT),j=Math.round(Math.min(NP-1,ph/PHIMAX*(NP-1))),k=(((i%NT)+NT)%NT)*NP+j;return C.clone().addScaledVector(d,sc(th,ph)+T[k]*0.85);};
      cut.extra({L,V,F,surf,d,push,mask:maskAt,base:solid,tipC:l.tips?cT.clone():solid});}}
  return {pos,col,cap,capC,tris,capTris:cap.length/9};}

/* ---------- face pieces ---------- */
const matCache=new Map();const tm=c=>{const k=typeof c==='string'?c:'#'+new THREE.Color(c).getHexString();if(!matCache.has(k))matCache.set(k,toon(new THREE.Color(k).getHex()));return matCache.get(k);};
function facing(obj,p,n,push){obj.position.copy(p).addScaledVector(n,push||0);obj.lookAt(obj.position.clone().add(n));return obj;}
function buildFace(root,l){const F=scalp().face,skin=new THREE.Color(l.skin),brow=l.browHair?l.hair:l.browCol,B=BROWS[l.brow];let tris=0;
  const add=(parent,geo,mat)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=false;parent.add(m);tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3;return m;};
  for(const side of [1,-1]){
    const E=F['eye'+side],g=facing(new THREE.Group(),E.p,E.n,0.15);root.add(g);
    add(g,new THREE.CylinderGeometry(1.25,1.25,0.4,8).rotateX(Math.PI/2),tm('#efe9de')).scale.set(1,0.56,1);
    add(g,new THREE.CylinderGeometry(0.52,0.52,0.42,6).rotateX(Math.PI/2),tm(l.eye)).position.set(0,-0.03,0.12);
    add(g,new THREE.CylinderGeometry(0.22,0.22,0.44,5).rotateX(Math.PI/2),tm('#0c0a0c')).position.set(0,-0.03,0.16);
    const bg=facing(new THREE.Group(),E.p.clone().add(new V3(side*0.15,1.75,0)),E.n,0.45);root.add(bg);
    const bm=add(bg,new THREE.BoxGeometry(3.0,B.th,0.7),tm(brow));bm.rotation.z=side*B.ang*DEG;bm.position.x=side*0.1;
    const R=F['ear'+side],eg=facing(new THREE.Group(),R.p,R.n,0);root.add(eg);
    const dark='#'+skin.clone().multiplyScalar(0.7).getHexString(),light='#'+skin.clone().lerp(new THREE.Color(0xffffff),0.06).getHexString();
    if(l.ear==='cauli'){const lump='#'+skin.clone().lerp(new THREE.Color(0x8a3d3d),0.22).getHexString();
      for(const [x,y,r] of [[0.2,0.6,0.95],[-0.5,-0.3,0.8],[0.5,-0.6,0.7],[-0.1,0.1,0.75]]){const m=add(eg,new THREE.IcosahedronGeometry(r,0),tm(lump));m.position.set(x,y,0.25);m.scale.z=0.7;}
      const rim=add(eg,new THREE.TorusGeometry(1.5,0.5,4,8,Math.PI*1.55),tm(lump));rim.rotation.z=-0.35*Math.PI;rim.position.z=0.1;}
    else{const bowl=add(eg,new THREE.CylinderGeometry(0.85,0.7,0.5,6).rotateX(Math.PI/2),tm(dark));bowl.scale.set(0.85,1.15,1);bowl.position.z=0.05;
      const rim=add(eg,new THREE.TorusGeometry(1.45,0.3,3,8,Math.PI*1.5),tm(light));rim.rotation.z=-0.3*Math.PI;rim.position.z=0.12;rim.scale.set(0.85,1.15,1);}}
  return tris;}

/* ---------- putting a look on a boxer ----------
   Only the parts that changed are redone: build, paint, hair, face. wraps (optional) overrides the wrap colour,
   which the title film uses for white hand wraps. */
const HIDE=new THREE.MeshBasicMaterial({visible:false}),hairMat=toon(0xffffff,{vertexColors:true});
const K=(l,keys)=>keys.map(k=>l[k]).join('|');
const KB=['weight','muscle'],KP=['skin','trunks','band','stripe','stripeCol','shortLen','wraps','boot','shoe','sole','hair'],KH=['cut','L','V','F','line','hair','tips','tip','skin'],KF=['eye','brow','browHair','browCol','ear','skin','hair'];
function apply(b,look,wraps){if(!b||!b.model||!b.geo)return 0;const l=clean(look,BASE);model(b.base);b.look=l;
  if(b.kB!==K(l,KB)){b.kB=K(l,KB);shape(b,l);}
  const kp=K(l,KP)+'|'+(wraps||'');if(b.kP!==kp){b.kP=kp;paint(b,l,wraps);}
  if(b.kH!==K(l,KH)){b.kH=K(l,KH);
    const own=l.cut==='original';b.body.material[1]=own?b.mat:HIDE;b.line.material[1]=own?OUTLINE_SKIN:HIDE;
    for(const o of b.hairParts||[]){o.parent.remove(o);o.geometry.dispose();}b.hairParts=[];b.hairTris=0;
    if(!own){const h=grow(l),hd=b.bones[MD.HB];
      for(const [p,c,mat,line] of [[h.cap,h.capC,hairMat,true],[h.pos,h.col,hairMat,true]]){if(!p.length)continue;
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
        g.applyMatrix4(MD.HEADINV);g.computeVertexNormals();
        const m=new THREE.Mesh(g,mat);m.castShadow=true;hd.add(m);b.hairParts.push(m);if(line){const o=new THREE.Mesh(g,OUTLINE);hd.add(o);b.hairParts.push(o);}}
      b.hairTris=h.tris;}}
  if(b.kF!==K(l,KF)){b.kF=K(l,KF);if(b.faceRoot){b.faceRoot.parent.remove(b.faceRoot);b.faceRoot.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
    const fr=new THREE.Group();fr.matrixAutoUpdate=false;fr.matrix.copy(MD.HEADINV);b.bones[MD.HB].add(fr);b.faceRoot=fr;b.faceTris=buildFace(fr,l);}
  return (b.hairTris||0)+(b.faceTris||0);}
return {BASE,CORNER,CUTS,CUTI,BROWS,EARS,BOOTN,clean,mine,save,forget,apply,cutDefaults,geometry};
})();
