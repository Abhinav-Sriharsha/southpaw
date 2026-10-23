/* South Paw · src/ui/hud.js
   Health and stamina bars, timer, pops, announcements and crowd reactions to events.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= UI ================= */
const annBox=$('#ann'),popBox=$('#pops'),hudEl=$('#hud'),helpEl=$('#help'),lbox=$('#lbox'),touchEl=$('#touch'),tbarEl=$('#tbar');
function announce(text,cls,ms){if(S.mode==='attract')return;const el=document.createElement('div');el.className='ann '+(cls||'');el.textContent=text;
  el.style.animationDuration=(ms||1100)+'ms';annBox.appendChild(el);setTimeout(()=>el.remove(),(ms||1100)+60);}
const hv=new V3(),hP=new V3();
function headPos(f){hP.set(0,10,3);B[f.i].hd.localToWorld(hP);return hP;}
function popAt(x,y,z,text,cls){if(S.mode==='attract'||S.state==='replay')return;
  hv.set(x,y,z);hv.project(camera);const el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=text;
  el.style.left=((hv.x*0.5+0.5)*window.innerWidth)+'px';el.style.top=((-hv.y*0.5+0.5)*window.innerHeight)+'px';popBox.appendChild(el);setTimeout(()=>el.remove(),1000);}
function pop(f,text,cls){const h=headPos(f);popAt(h.x,h.y+0.35,h.z,text,cls);}
const lastEl=$('#lastHit'),speedEl=$('#speed');
const stEls={t:$('#stThrown'),l:$('#stLanded'),a:$('#stAcc'),c:$('#stCombo')};
const hud={side:[$('#hud .p1'),$('#hud .p2')],n:[$('#n0'),$('#n1')],cn:[$('#c0'),$('#c1')],h:[$('#h0'),$('#h1')],g:[$('#g0'),$('#g1')],s:[$('#s0'),$('#s1')],hb:[$('#hb0'),$('#hb1')],sb:[$('#sb0'),$('#sb1')],time:$('#time'),rnd:$('#rnd'),w:[$('#w0'),$('#w1')]};
const hudLast=[{h:-1,g:-1,s:-1,c:-1,m:-1},{h:-1,g:-1,s:-1,c:-1,m:-1}];let hudKey='';
const capEl=[$('#cap0'),$('#cap1')],smEl=[$('#sm0'),$('#sm1')],guEl=$('#getup'),guFill=$('#guFill');let wobOn=false;
const slotF=k=>S.F[k===0?LOC():1-LOC()];
function hudLabels(){for(let k=0;k<2;k++){const f=slotF(k);hud.side[k].dataset.c=String(f.i);hud.cn[k].textContent=f.i?'Blue':'Red';
  hud.n[k].textContent=S.mode==='online'?(f.i===LOC()?'You':S.names[f.i]):(f.i===0?S.names[0]:S.names[1]);}hudLast.forEach(l=>{l.h=l.g=l.s=l.c=l.m=-1;});}
let dimmed=false;const noteEl=$('#note');let noteTO=0;
function showNote(t){if(!noteEl)return;noteEl.textContent=t;noteEl.classList.add('on');clearTimeout(noteTO);noteTO=setTimeout(()=>noteEl.classList.remove('on'),4200);}
function updateHUD(){const dm=S.state!=='fight'&&!(S.state==='down'&&S.down&&S.down.i===LOC()&&!S.down.up);if(dm!==dimmed){dimmed=dm;touchEl.classList.toggle('dim',dm);}
  if(hudEl.hidden)return;
  for(let k=0;k<2;k++){const f=slotF(k),L=hudLast[k];const h=Math.round(f.hp*10),g=Math.round(f.hpGhost*10),s=Math.round(f.stam*10);
    if(h!==L.h){L.h=h;hud.h[k].style.transform='scaleX('+(h/1000)+')';hud.hb[k].classList.toggle('low',f.hp<25&&f.hp>0);}
    if(g!==L.g){L.g=g;hud.g[k].style.transform='scaleX('+(g/1000)+')';}
    if(s!==L.s){L.s=s;hud.s[k].style.transform='scaleX('+(s/1000)+')';hud.sb[k].classList.toggle('tired',f.gassed||f.stam<20);}
  }
  const D=S.down,gu=!!(D&&!D.up&&D.i===LOC()&&S.mode!=='attract');guEl.hidden=!gu;if(gu)guFill.style.transform='scaleX('+clamp(D.prog/D.need,0,1)+')';
  const me=S.F[LOC()],wb=S.mode!=='attract'&&me.wob>0&&S.state==='fight';if(wb){hurtEl.style.transition='none';hurtEl.style.opacity=(0.16+0.1*Math.sin(realT/170)).toFixed(3);wobOn=true;}else if(wobOn){wobOn=false;hurtEl.style.opacity=0;}
  if(S.mode!=='practice'){const s=String(Math.ceil(S.timer));if(hud.time.textContent!==s){hud.time.textContent=s;hud.time.classList.toggle('hurry',S.timer<10);}}
  else{const st=S.st,k=st.thrown+'|'+st.landed+'|'+st.best;if(k!==hudKey){hudKey=k;stEls.t.textContent=st.thrown;stEls.l.textContent=st.landed;
    stEls.a.textContent=st.thrown?Math.round(st.landed/st.thrown*100)+'%':'0%';stEls.c.textContent=st.best;}}}
function renderPips(){for(let k=0;k<2;k++){const f=slotF(k);[...hud.w[k].children].forEach((c,j)=>c.classList.toggle('on',j<S.wins[f.i]));}}
const SEEN=new Set(),SEENQ=[];
function seen(k){if(SEEN.has(k))return true;SEEN.add(k);SEENQ.push(k);if(SEENQ.length>800)SEEN.delete(SEENQ.shift());return false;}
function drainEvents(){
  for(const e of EVQ){if(e.k&&seen(e.k))continue;
    switch(e.ty){
      case 'fx':spawnFx(e,true);lastAtkT=realT;
        if(S.mode!=='attract'&&!e.bag){if(!e.blk){
          if(e.label==='Counter'){Sfx.react('gasp',0.8);Sfx.react('ooh',0.95);}else if(e.p>0.62)Sfx.react('ooh',0.55+e.p*0.35);
          if(e.combo>=3)Sfx.react('cheer',0.35+0.12*Math.min(e.combo,6));}}
        else if(e.bag&&e.combo>=3)Sfx.react('ooh',0.3);break;
      case 'sfx':if(e.n==='step')Sfx.step();else if(e.n==='swish'){Sfx.swish(e.a);lastAtkT=realT;}else if(e.n==='whiff')Sfx.whiff();else if(e.n==='block')Sfx.block();else if(e.n==='bell')Sfx.bell(e.a);break;
      case 'ann':announce(e.text,e.cls,e.ms);if(e.cls==='count')Sfx.count(+e.text);else if(e.text==='Box!'){Sfx.react('cheer',0.9,1.8);Sfx.applause(1.6,0.5);}break;
      case 'note':showNote(e.text);break;
      case 'pop':pop(S.F[e.f],e.text,e.cls);if(e.text==='Wobbled'||e.text==='Guard break')Sfx.react('roar',0.55,1.6);else if(e.cls==='slip')Sfx.react('ooh',0.28);
        else if(e.text==='Caught taunting'){Sfx.react('gasp',0.9);Sfx.react('roar',0.7,1.4);}else if(e.text==='Kidney')Sfx.react('ooh',0.6);break;
      case 'taunt':if(S.mode!=='attract'){Sfx.react('ooh',0.4);crowdExcite=Math.max(crowdExcite,0.6);}break;
      case 'tauntDone':if(S.mode!=='attract'){Sfx.react('cheer',0.7,1.4);crowdExcite=Math.max(crowdExcite,0.75);if(e.f===LOC()&&S.mode!=='attract')pop(S.F[e.f],'Second wind','slip');}break;
      case 'popAt':if(!S.show)popAt(e.x,e.y,e.z,e.text,e.cls);break;
      case 'last':if(S.mode==='practice')lastEl.textContent=e.text;break;
      case 'fight':crowdExcite=Math.max(crowdExcite,0.5);Sfx.react('cheer',0.45,1.2);break;
      case 'liver':addTrauma(0.3);screenFlash(0.12);crowdExcite=1;cam.kick=0.6;if(S.mode!=='attract'){Sfx.react('ko',0.9,6);buzz(e.by===LOC()?[20,30,40]:[50,40,90]);}break;
      case 'kd':addTrauma(0.35);screenFlash(0.15);crowdExcite=1;cam.kick=0.8;if(S.mode!=='attract'){Sfx.knockdown();buzz(e.by===LOC()?[20,30,40]:[50,40,90]);}break;
      case 'ko':addTrauma(0.6);screenFlash(0.35);crowdExcite=1;cam.kick=1.2;if(S.mode!=='attract'){Sfx.boom();buzz(e.by===LOC()?[30,40,60]:[60,50,120]);}break;
      case 'roundEnd':renderPips();Sfx.applause(2.2,0.55);{const w=e.w;announce(w<0?'Draw':(w===LOC()&&S.mode!=='attract'?'You take round '+S.round:S.names[w]+' takes round '+S.round),'small',1700);}break;
    }}
  EVQ.length=0;}
