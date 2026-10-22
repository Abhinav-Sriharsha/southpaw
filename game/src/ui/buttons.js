/* South Paw · src/ui/buttons.js
   Wires up every menu and toolbar button.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= BUTTONS ================= */
function toggleSound(){const on=Sfx.toggle();$('#btnSound').textContent='Sound: '+(on?'on':'off');}
function rematch(){if(S.mode==='online'){LI.ready=1;$('#btnRematch').textContent='Waiting…';$('#rematchNote').textContent='Waiting for '+S.names[1-LOC()]+' to accept.';}else startMatch();}
G.diff='normal';try{const d=localStorage.getItem('gj_diff');if(DIFF[d])G.diff=d;}catch(e){}
document.querySelectorAll('.diffs.level button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.d===G.diff));
  b.addEventListener('click',()=>{G.diff=b.dataset.d;try{localStorage.setItem('gj_diff',G.diff);}catch(e){}document.querySelectorAll('.diffs.level button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});});
$('#btnCpu').addEventListener('click',startMatch);$('#btnPrac').addEventListener('click',startPractice);$('#btnOnline').addEventListener('click',openOnline);
$('#btnQuick').addEventListener('click',quickMatch);$('#btnCreate').addEventListener('click',hostRoom);
$('#btnJoin').addEventListener('click',()=>joinRoom($('#codeIn').value));$('#codeIn').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom($('#codeIn').value);});
$('#btnNetBack').addEventListener('click',cancelOnline);
$('#btnCopyLink').addEventListener('click',()=>{const link=location.origin+location.pathname+'#'+NET.code;const done=()=>{$('#btnCopyLink').textContent='Copied';setTimeout(()=>{$('#btnCopyLink').textContent='Copy invite';},1500);};
  const text='Fight me on South Paw. Room '+NET.code+' '+link;if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done).catch(()=>{});});
$('#btnResume').addEventListener('click',()=>{if(TOUCH&&isPortrait()&&S.mode!=='online')return;setPaused(false);});$('#btnSound').addEventListener('click',toggleSound);
$('#btnQuit').addEventListener('click',()=>{if(S.mode==='online'){netLeave(false);}startAttract();});
$('#btnRematch').addEventListener('click',rematch);$('#btnMenu').addEventListener('click',()=>{if(S.mode==='online')netLeave(false);startAttract();});
$('#btnCopy').addEventListener('click',()=>{const t=$('#bragText');const done=()=>{$('#btnCopy').textContent='Copied';};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.value).then(done).catch(()=>{t.select();try{document.execCommand('copy');done();}catch(e){}});else{t.select();try{document.execCommand('copy');done();}catch(e){}}});
$('#tPause').addEventListener('click',()=>setPaused(true));
$('#tSlow').addEventListener('click',cycleSpeed);$('#tCam').addEventListener('click',cycleCam);$('#tReplay').addEventListener('click',()=>startReplayS('prac'));
tbarEl.addEventListener('pointerdown',e=>e.stopPropagation());
