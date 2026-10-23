/* South Paw · src/main.js
   Starts the game.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
startAttract();
/* Invite links end in #CODE. Handle one on start, and also when a link is opened while the game is already open
   (only the #CODE part changes then, so the page does not reload). The code is then removed from the address,
   so reloading later doesn't try to rejoin an old room. */
function takeInvite(){const hm=(location.hash||'').match(/^#([A-Za-z0-9]{4})$/);if(!hm)return;
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  if(NET.started)return;const code=hm[1].toUpperCase();introSkip();
  if(LOBBY.on&&LOBBY.code===code)return;
  if(S&&S.mode!=='attract')startAttract();
  openOnline();$('#codeIn').value=code;setTimeout(()=>joinRoom(code),300);}
window.addEventListener('hashchange',takeInvite);takeInvite();
requestAnimationFrame(frame);
