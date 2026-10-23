/* South Paw · src/input/touch.js
   Touch controls: the fixed stick and the four buttons.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= INPUT: touch ================= */
const stickEl=$('#stick'),knobEl=$('#knob'),zoneEl=$('#stickZone');
let stickId=null,sx0=0,sy0=0;
let stickSize=120;
/* fixed pixel size, set from script, so the stick stays a true circle whatever the browser bars do */
function sizeStick(){stickSize=Math.round(clamp(Math.min(window.innerHeight,window.innerWidth)*0.27,104,136));stickEl.style.width=stickEl.style.height=stickSize+'px';
  const k=Math.round(stickSize*0.44);knobEl.style.width=knobEl.style.height=k+'px';}
window.addEventListener('resize',sizeStick);
function stickRadius(){return stickSize*0.47;}
function placeStick(x,y){stickEl.style.left=x+'px';stickEl.style.top=y+'px';}
function resetStick(){stickId=null;STICK.on=false;STICK.jx=STICK.jy=0;knobEl.style.transform='translate(-50%,-50%)';stickEl.classList.remove('live');}
/* the stick stays put: a touch anywhere on the left side steers it from its fixed centre */
zoneEl.addEventListener('pointerdown',e=>{if(stickId!==null||G.paused)return;
  {const r=stickEl.getBoundingClientRect();if(Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2))>stickRadius()*2.6)return;}
  e.preventDefault();stickId=e.pointerId;try{zoneEl.setPointerCapture(e.pointerId);}catch(_){}
  const r=stickEl.getBoundingClientRect();sx0=r.left+r.width/2;sy0=r.top+r.height/2;stickEl.classList.add('live');STICK.on=true;stickMove(e);});
function stickMove(e){const R=stickRadius();
  const dx=e.clientX-sx0,dy=e.clientY-sy0;
  const mm=Math.hypot(dx,dy),cl=mm>R?R/mm:1;knobEl.style.transform='translate(calc(-50% + '+(dx*cl)+'px),calc(-50% + '+(dy*cl)+'px))';
  STICK.jx=dx*cl/R;STICK.jy=dy*cl/R;}
zoneEl.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;e.preventDefault();stickMove(e);});
const stickUp=e=>{if(e.pointerId!==stickId)return;resetStick();};
zoneEl.addEventListener('pointerup',stickUp);zoneEl.addEventListener('pointercancel',stickUp);zoneEl.addEventListener('lostpointercapture',stickUp);
document.querySelectorAll('.tb').forEach(btn=>{
  const p=btn.dataset.p,dg=btn.dataset.d!==undefined,hold=btn.dataset.hold!==undefined,tt=btn.dataset.t!==undefined;
  btn.addEventListener('pointerdown',e=>{e.preventDefault();try{btn.setPointerCapture(e.pointerId);}catch(_){}btn.classList.add('on');
    if(hold){TB.block=true;if(S.state==='down')LI.act=1;}else if(dg)dodgeDown();else if(tt)tauntDown();else punchDown(p);});
  const up=()=>{if(!btn.classList.contains('on'))return;btn.classList.remove('on');if(hold)TB.block=false;if(p)punchUp(p);};
  btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
  btn.addEventListener('contextmenu',e=>e.preventDefault());
});
window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!usingTouch){usingTouch=true;document.body.classList.add('touch');if(S.mode!=='attract'&&S.state!=='replay'){touchEl.hidden=false;helpEl.hidden=true;}}},true);
if(usingTouch)document.body.classList.add('touch');
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('dblclick',e=>{if(S&&S.mode!=='attract')e.preventDefault();},{passive:false});
canvas.addEventListener('pointerdown',()=>{canvas.focus({preventScroll:true});if(S.state==='replay')LI.skip=1;});
lbox.addEventListener('pointerdown',()=>{if(S.state==='replay')LI.skip=1;});
$('.rskip').textContent=usingTouch?'Tap to skip':'Space to skip';
sizeStick();

/* Knocked down: every tap or click anywhere counts toward getting up (not just the punch buttons).
   The pause button and menus still work as normal. */
function getUpTap(){const D=S&&S.down;if(!D||D.up||S.state!=='down'||G.paused||S.mode==='attract'||D.i!==LOC())return false;LI.act=1;return true;}
window.addEventListener('pointerdown',e=>{if(e.target&&e.target.closest&&e.target.closest('#tbar,.screen,#fsBtn,#instBar,#fsHint'))return;getUpTap();},true);
