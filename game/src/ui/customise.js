/* South Paw · src/ui/customise.js
   The Customise screen (last item on the title menu): the options on the left, your fighter on the right in his guard,
   turning when you drag him. Every change is put on him at once (src/render/look.js) and saved on this device.
   While it is open the title film pauses: this file poses him (custPose) and frames him (custCamera) instead.
   assignLooks puts the looks on both boxers whenever a mode starts: yours on your boxer, the other player's online
   (sent in the hello message, src/net/online.js), the corner's standard look for anyone who has not customised.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const CUST={on:false,yaw:0,tab:0,look:null,cam:new V3(),tgt:new V3(),init:false};
const FILM_WRAPS='#f1ede4';
function assignLooks(){if(!S||!B[0]||!B[0].model)return;const my=LOOK.mine();
  if(S.mode==='online'){const L=NET.local|0;LOOK.apply(B[L],my||LOOK.CORNER[L]);LOOK.apply(B[1-L],(NET.opp&&NET.opp.look)||LOOK.CORNER[1-L]);}
  else{LOOK.apply(B[0],my||LOOK.CORNER[0],S.show&&!CUST.on?FILM_WRAPS:null);const cf=S.career&&CAR_FIGHTER[S.career.opp];LOOK.apply(B[1],cf?cf.look:LOOK.CORNER[1]);}}

/* ---------- the options ---------- */
const CU_HAIR=[['Black','#141013'],['Dark brown','#2a1a12'],['Brown','#5a3820'],['Auburn','#7a3016'],['Blond','#c9a25a'],['Platinum','#e6dcc2'],['Grey','#8d8b88'],['Red','#c8281f'],['Blue','#2457c9']];
const CU_SKIN=[['Red corner','#d59a6c'],['Blue corner','#8a5636'],['Fair','#f0c9a4'],['Olive','#c08a5c'],['Deep','#5e3a24'],['Pale','#ffe1bc']];
const CU_EYES=[['Dark brown','#2a1a10'],['Brown','#5a3a1e'],['Hazel','#7a6a2e'],['Green','#3f7a45'],['Blue','#3a6fb8'],['Grey','#7d8a94']];
const CU_KIT=[['Red','#d8302a'],['Blue','#1e5bd0'],['Black','#17181d'],['White','#f1ece1'],['Gold','#ffc83a'],['Green','#2f8f4e'],['Purple','#6a3fb5'],['Pink','#e0699a']];
const CU_SHOES=[['Black','#16171c'],['White','#eeeae0'],['Red','#c8281f'],['Blue','#2457c9'],['Gold','#d8aa2e']];
const GUARDS=[[3,'#1'],[6,'#2'],[10,'#3'],[13,'#4'],[16,'#5'],[19,'#6'],[22,'#7'],[25,'#8']];
function fmtLen(cm){if(cm>=2.6)return cm.toFixed(1)+' cm';const mm=Math.round(cm*10),g=GUARDS.find(x=>Math.abs(x[0]-mm)<=1.6);return mm+' mm'+(g?' · '+g[1]+' guard':'');}
function buildName(w){return w<-0.6?'Very lean':w<-0.2?'Lean':w<0.2?'Middleweight':w<0.6?'Heavy':'Heavyweight';}
function muscleName(m){return m<0.2?'Lean':m<0.55?'Toned':m<0.85?'Built':'Bodybuilder';}
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
function cuSection(title,...kids){const s=el('div','cusec');s.appendChild(el('h3',null,title));kids.forEach(k=>k&&s.appendChild(k));return s;}
function cuSwatches(list,key,pickId){const w=el('div','cusw');
  for(const [n,h] of list){const b=el('button','sw');b.type='button';b.style.background=h;b.title=n;b.setAttribute('aria-label',n);b.setAttribute('aria-pressed',String(CUST.look[key]===h));
    b.addEventListener('click',()=>{CUST.look[key]=h;custChanged(true);});w.appendChild(b);}
  if(pickId){const lab=el('label','cupick');lab.htmlFor=pickId;lab.textContent='Any';const i=el('input');i.type='color';i.id=pickId;i.value=CUST.look[key];
    i.addEventListener('input',()=>{CUST.look[key]=i.value;custChanged(false);});i.addEventListener('change',()=>custChanged(true));lab.appendChild(i);w.appendChild(lab);}
  return w;}
function cuChips(list,key){const w=el('div','cuchips');for(const [k,n] of list){const b=el('button','chip');b.type='button';b.textContent=n;b.setAttribute('aria-pressed',String(CUST.look[key]===k));
  b.addEventListener('click',()=>{CUST.look[key]=k;custChanged(true);});w.appendChild(b);}return w;}
function cuToggle(id,label,key,after){const lab=el('label','cutog');lab.htmlFor=id;const i=el('input');i.type='checkbox';i.id=id;i.checked=!!CUST.look[key];
  i.addEventListener('change',()=>{CUST.look[key]=i.checked;if(after)after();custChanged(true);});lab.appendChild(i);lab.appendChild(document.createTextNode(' '+label));return lab;}
function cuColor(id,label,key,after){const lab=el('label','cupick');lab.htmlFor=id;lab.textContent=label;const i=el('input');i.type='color';i.id=id;i.value=CUST.look[key];
  i.addEventListener('input',()=>{CUST.look[key]=i.value;if(after)after();custChanged(false);});i.addEventListener('change',()=>custChanged(true));lab.appendChild(i);return lab;}
// a slider: v in the look; show(v) is the readout; off greys it out for cuts that ignore it
function cuSlider(id,label,key,min,max,show,note,off){const w=el('div','cusl'+(off?' off':''));const lab=el('label',null,label);lab.htmlFor=id;const out=el('output');out.textContent=show(CUST.look[key]);
  const i=el('input');i.type='range';i.id=id;i.min=min;i.max=max;i.step='0.01';i.value=CUST.look[key];i.disabled=!!off;
  i.addEventListener('input',()=>{CUST.look[key]=+i.value;out.textContent=show(+i.value);custChanged(false);});
  w.append(lab,out,i);if(note)w.appendChild(el('small',null,note));return w;}
function cuRow(...kids){const r=el('div','curow');kids.forEach(k=>r.appendChild(k));return r;}
function custRender(){
  const body=$('#custBody'),L=CUST.look,cut=LOOK.CUTI[L.cut],top=body.scrollTop;body.innerHTML='';
  document.querySelectorAll('.ctab').forEach((t,i)=>t.setAttribute('aria-selected',String(i===CUST.tab)));
  if(CUST.tab===0){
    const g=el('div','cucuts');for(const c of LOOK.CUTS){const b=el('button','cucut');b.type='button';b.setAttribute('aria-pressed',String(L.cut===c.id));
      b.append(el('b',null,c.name),el('span',null,c.note));b.addEventListener('click',()=>{LOOK.cutDefaults(L,c.id);custChanged(true);});g.appendChild(b);}
    const len=x=>cut.len?fmtLen(cut.len[0]+(cut.len[1]-cut.len[0])*x):'·';
    body.append(cuSection('Cut',g),
      cuSection('Clippers',cuSlider('cuLen','Length','L',0,1,len,null,!cut.len),cuSlider('cuVol','Volume','V',0,1,x=>Math.round(x*100)+'%',cut.vNote||null,!cut.vNote),
        cuSlider('cuFade','Sides','F',0,1,x=>x<0.08?'Skin fade':Math.round(x*100)+'%','Left is a skin fade, right keeps the sides full.',!cut.t||cut.fade==null),
        cuSlider('cuLine','Hairline','line',-1,1,x=>x>0.05?'Higher':x<-0.05?'Lower':'Natural',null,!cut.t)),
      cuSection('Hair colour',cuSwatches(CU_HAIR,'hair','cuHairPick'),cuRow(cuToggle('cuTips','Dyed tips','tips'),cuColor('cuTipPick','Tips','tip',()=>{L.tips=true;}))));}
  else if(CUST.tab===1){
    body.append(cuSection('Eyes',cuSwatches(CU_EYES,'eye')),
      cuSection('Eyebrows',cuChips(Object.entries(LOOK.BROWS).map(([k,v])=>[k,v.name]),'brow'),cuRow(cuToggle('cuBrowHair','Match the hair','browHair'),cuColor('cuBrowPick','Colour','browCol',()=>{L.browHair=false;}))),
      cuSection('Ears',cuChips(Object.entries(LOOK.EARS),'ear'),el('p','cunote','Cauliflower ear is the swollen, lumpy ear years of sparring leave on a boxer.')));}
  else if(CUST.tab===2){
    body.append(cuSection('Skin',cuSwatches(CU_SKIN,'skin','cuSkinPick')),
      cuSection('Build',cuSlider('cuWeight','Weight','weight',-1,1,buildName,'Thin on the left, heavy on the right.'),cuSlider('cuMuscle','Muscle','muscle',0,1,muscleName,'Chest, shoulders, arms and thighs.'),
        el('p','cunote','Only his look changes. Every fighter keeps the same reach and the same places to hit.')));}
  else{
    body.append(cuSection('Shorts',cuSwatches(CU_KIT,'trunks','cuTrunkPick'),cuSlider('cuShort','Leg length','shortLen',-1,1,x=>x<-0.35?'Short':x>0.35?'Long':'Standard')),
      cuSection('Waistband and stripe',cuSwatches(CU_KIT,'band','cuBandPick'),cuRow(cuToggle('cuStripe','Side stripe','stripe'),cuColor('cuStripePick','Stripe','stripeCol',()=>{L.stripe=true;}))),
      cuSection('Hand wraps',cuSwatches(CU_KIT,'wraps','cuWrapPick')),
      cuSection('Shoes',cuChips(Object.entries(LOOK.BOOTN),'boot'),cuSwatches(CU_SHOES,'shoe','cuShoePick'),cuRow(cuColor('cuSolePick','Sole','sole'))));}
  body.scrollTop=top;}
function custChanged(rerender){const tris=LOOK.apply(B[0],CUST.look,null);LOOK.save(CUST.look);if(rerender)custRender();
  $('#custBudget').textContent=tris.toLocaleString()+' triangles of hair and face';}
function custTab(i){CUST.tab=i;$('#custBody').scrollTop=0;custRender();}

/* ---------- open and close ---------- */
function custOpen(){if(!S||!S.show||!B[0].model)return;hideScreens();
  CUST.look=Object.assign({},LOOK.mine()||LOOK.CORNER[0]);CUST.on=true;CUST.init=false;CUST.yaw=0;
  $('#custom').hidden=false;document.body.classList.add('cust');showBag(false);custRender();custChanged(false);
}
function custClose(){if(!CUST.on)return;CUST.on=false;$('#custom').hidden=true;document.body.classList.remove('cust');
  if(S&&S.show){showBag(true);$('#title').hidden=false;titleStep('menu');}
  assignLooks();}
function custReset(){LOOK.forget();CUST.look=Object.assign({},LOOK.CORNER[0]);LOOK.apply(B[0],CUST.look,null);custRender();$('#custBudget').textContent='Back to the standard red corner look';}

/* ---------- posing and framing him while the screen is open ---------- */
const custSPO=mkPose(),cuP=new V3(),cuT=new V3();
function custPose(b){const n=CL[CI.idle].n;sampleClip(CI.idle,(realT/1000*30)%(n-1),custSPO);
  for(let i=0;i<NB;i++)b.bones[i].quaternion.fromArray(custSPO.q,i*4);b.hips.position.set(custSPO.hp[0],custSPO.hp[1],custSPO.hp[2]);
  b.root.position.set(0,0,0);b.root.rotation.y=CUST.yaw;b.root.updateMatrixWorld(true);showRope.visible=false;
  b.hips.getWorldPosition(cuP);showKey.position.set(cuP.x+(camera.position.x-cuP.x)*0.35,4.2,cuP.z+(camera.position.z-cuP.z)*0.35);showKey.target.position.copy(cuP);
  showRim.position.set(cuP.x-(camera.position.x-cuP.x)*2,3.2,cuP.z-(camera.position.z-cuP.z)*2);showRim.target.position.copy(cuP);}
function custCamera(dt){const head=CUST.tab<2,a=0.38,r=head?1.7:3.7;
  cuT.set(0,head?1.6:0.98,head?0.04:0);cuP.set(cuT.x+Math.sin(a)*r,head?1.7:1.3,cuT.z+Math.cos(a)*r);
  if(!CUST.init){CUST.init=true;CUST.cam.copy(cuP);CUST.tgt.copy(cuT);}else{const k=1-Math.exp(-dt/1000*5);CUST.cam.lerp(cuP,k);CUST.tgt.lerp(cuT,k);}
  if(Math.abs(camera.fov-30)>0.01){camera.fov=30;camera.updateProjectionMatrix();}
  camera.position.copy(CUST.cam);camera.lookAt(CUST.tgt);cam.look.copy(CUST.tgt);
  // the panel covers the left: turn so he stands in the middle of what is left (or the top, on a tall screen)
  const th=Math.tan(camera.fov*Math.PI/360);
  if(camera.aspect>=1)camera.rotateY(Math.atan(0.46*th*camera.aspect));else camera.rotateX(-Math.atan(0.55*th));}

/* ---------- wiring ---------- */
$('#btnCustom').addEventListener('click',custOpen);
$('#btnCustDone').addEventListener('click',custClose);
$('#btnCustReset').addEventListener('click',custReset);
document.querySelectorAll('.ctab').forEach((t,i)=>t.addEventListener('click',()=>custTab(i)));
{const st=$('#custStage');let px=null;
  st.addEventListener('pointerdown',e=>{px=e.clientX;try{st.setPointerCapture(e.pointerId);}catch(x){}});
  st.addEventListener('pointermove',e=>{if(px==null)return;CUST.yaw+=(e.clientX-px)*0.012;px=e.clientX;});
  const up=()=>{px=null;};st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);}
window.addEventListener('keydown',e=>{if(CUST.on&&e.key==='Escape'){e.preventDefault();custClose();}});
