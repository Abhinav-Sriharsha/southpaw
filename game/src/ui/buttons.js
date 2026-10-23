/* South Paw · src/ui/buttons.js
   Wires up every menu and toolbar button.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= BUTTONS ================= */
function toggleSound(){const on=Sfx.toggle();$('#btnSound').textContent='Sound: '+(on?'on':'off');}
function rematch(){if(S.mode==='online'){LI.ready=1;$('#btnRematch').textContent='Waiting…';$('#rematchNote').textContent='Waiting for '+S.names[1-LOC()]+' to accept.';}else startMatch();}
G.diff='normal';try{const d=localStorage.getItem('gj_diff');if(DIFF[d])G.diff=d;}catch(e){}
// Fight the CPU opens the opponent page; pick one, then Fight
function markOpp(){document.querySelectorAll('.opp').forEach(x=>{const on=x.dataset.d===G.diff;x.setAttribute('aria-checked',String(on));x.classList.toggle('on',on);});}
document.querySelectorAll('.opp').forEach(b=>{const L=DIFF[b.dataset.d];if(L&&L.name)b.querySelector('.oname').textContent=L.name;
  b.addEventListener('click',()=>{G.diff=b.dataset.d;try{localStorage.setItem('gj_diff',G.diff);}catch(e){}markOpp();});});markOpp();
function openCpu(){hideScreens();markOpp();$('#cpu').hidden=false;}
$('#btnCpu').addEventListener('click',openCpu);$('#btnFight').addEventListener('click',startMatch);
$('#btnCpuBack').addEventListener('click',()=>{$('#cpu').hidden=true;$('#title').hidden=false;});$('#btnPrac').addEventListener('click',startPractice);$('#btnOnline').addEventListener('click',openOnline);
$('#btnQuick').addEventListener('click',quickMatch);$('#btnCreate').addEventListener('click',hostRoom);
$('#btnJoin').addEventListener('click',()=>joinRoom($('#codeIn').value));$('#codeIn').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom($('#codeIn').value);});
// typing or pasting a code (or a whole invite message) keeps just the 4 characters, in capitals
$('#codeIn').addEventListener('input',e=>{const el=e.target,c=cleanCode(el.value);if(el.value!==c)el.value=c;});
// Paste invite: reads the message your friend sent (link or code) from the clipboard and joins straight away
if(navigator.clipboard&&navigator.clipboard.readText){$('#btnPaste').hidden=false;
  $('#btnPaste').addEventListener('click',()=>{navigator.clipboard.readText().then(t=>{const c=cleanCode(t);if(c.length===4){$('#codeIn').value=c;joinRoom(c);}
    else netStatus("No room code found in what you copied. Type the 4-letter code instead.");}).catch(()=>netStatus('Type the 4-letter room code your friend sent.'));});}
$('#btnNetBack').addEventListener('click',cancelOnline);
$('#btnReady').addEventListener('click',()=>{goFull(true);lobbySetReady(!LOBBY.me);});$('#btnLobLeave').addEventListener('click',lobbyLeave);
$('#btnLobCopy').addEventListener('click',e=>lobbyCopy(e.currentTarget));$('#btnLobRetry').addEventListener('click',()=>{if(LOBBY.retry)LOBBY.retry();});
$('#btnLobShare').addEventListener('click',()=>{try{navigator.share({title:'South Paw',text:'Fight me on South Paw! Room code '+LOBBY.code,url:lobbyLink()}).catch(()=>{});}catch(e){}});
$('#btnFull').addEventListener('click',fsToggle);
$('#fsSwipe').addEventListener('click',()=>{if(fsKeepMode==='tap')goFull(true);});$('#fsBtn').addEventListener('click',fsToggle);
$('#fsHint').addEventListener('click',()=>{$('#fsHint').hidden=true;});
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
