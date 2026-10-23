/* South Paw · src/input/keyboard.js
   Keyboard controls.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= INPUT: keyboard ================= */
const NOSCROLL=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
const onButton=()=>{const a=document.activeElement;return a&&(a.tagName==='BUTTON'||a.tagName==='INPUT');};
window.addEventListener('keydown',e=>{
  const c=e.code;if(document.activeElement&&document.activeElement.tagName==='INPUT')return;
  if(S.mode!=='attract'&&NOSCROLL.includes(c)&&!onButton())e.preventDefault();
  if(c==='KeyM'&&!e.repeat&&!onButton())toggleSound();
  if(S.mode==='attract'){if(c==='Enter'&&!$('#title').hidden&&!onButton()){e.preventDefault();startMatch();}return;}
  if((c==='Escape'||c==='KeyP')&&!e.repeat){setPaused($('#pause').hidden);return;}
  if(G.paused)return;
  if(!e.repeat&&getUpTap())return;
  if(S.state==='replay'){if(c==='Space'||c==='Enter'||c==='KeyR'){e.preventDefault();LI.skip=1;}return;}
  if(S.state==='matchEnd'){if(c==='Enter'&&!$('#end').hidden&&!onButton()){e.preventDefault();rematch();}return;}
  if(!e.repeat){
    if(S.mode==='practice'){if(c==='KeyT'){cycleSpeed();return;}if(c==='KeyC'){cycleCam();return;}if(c==='KeyR'){startReplayS('prac');return;}}}
  keys.add(c);LI.latch.add(c);
  if(e.repeat)return;
  const pa=MAP.press[c];if(pa==='L'||pa==='R')punchDown(pa);else if(pa==='D')dodgeDown();else if(c==='KeyT'&&S.mode!=='practice')tauntDown();
});
window.addEventListener('keyup',e=>{keys.delete(e.code);const pa=MAP.press[e.code];if(pa==='L'||pa==='R'){if(!['L','R'].some(h=>h===pa&&Object.keys(MAP.press).some(k=>MAP.press[k]===h&&k!==e.code&&keys.has(k))))punchUp(pa);}});
window.addEventListener('blur',()=>{keys.clear();resetStick();TB.block=false;PBT.L.down=PBT.R.down=false;if(S&&S.mode!=='attract'&&S.mode!=='online'&&S.state!=='matchEnd'&&!G.paused)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S&&S.mode!=='attract'&&S.mode!=='online'&&S.state!=='matchEnd'&&!G.paused)setPaused(true);});
