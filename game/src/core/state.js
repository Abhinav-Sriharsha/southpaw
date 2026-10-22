/* South Paw · src/core/state.js
   Page-level state shared by the renderer and the menus.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= STATE ================= */
const STEP=1000/120;
const G={mode:'attract',state:'fight',stateT:0,paused:false,round:1,wins:[0,0],timer:60,timeScale:1,hitstop:0,hitTarget:-1,
  diff:'normal',map:null,koWinner:0,koTick:0,koPos:new V3(),matchWinner:-1,lastKO:false};
let simNow=0,realT=0,crowdExcite=0.1;
const frameEvents=[];const keys=new Set();
function setState(s){G.state=s;G.stateT=0;}
const timers=[];
function later(ms,fn){timers.push({ms,fn});}
function tickTimers(dt){for(let i=0;i<timers.length;i++){const t=timers[i];t.ms-=dt;if(t.ms<=0){timers.splice(i,1);i--;t.fn();}}}
