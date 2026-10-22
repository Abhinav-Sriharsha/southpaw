/* South Paw · src/main.js
   Starts the game.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
startAttract();
{const hm=(location.hash||'').match(/^#([A-Za-z0-9]{4})$/);if(hm){openOnline();$('#codeIn').value=hm[1].toUpperCase();setTimeout(()=>joinRoom(hm[1]),300);}}
requestAnimationFrame(frame);
