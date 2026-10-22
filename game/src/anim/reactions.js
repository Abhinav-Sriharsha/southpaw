/* South Paw · src/anim/reactions.js
   Animation timing tables: hit reactions, block hits, knockdown falls and get-ups, and the visual state keys.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const ALLK=['am','amx','amy','amz','amh','hipR','mir','msk','mir0','msk0','bk','hz','ev','aw','x','z','yaw','it','fc','ft','fc0','ft0','fx','fw','sc','st','sc0','st0','sx','sw','a0','t0','a1','t1','bw','low','sl','sd','dl','hx','hr','flash','gsL','gsR','trL','trR'];
const BLEND={liver:0.06,slip:0.1,block:0.1,idle:0.18,hit:0.06,ko:0.06,down:0.06,down2:0.22,rise:0.12,win:0.25,taunt:0.2};
/* Hit reactions. Right-hand shots land on the left side of the face, left-hand shots on the right.
   Each clip is listed as [start, snap peak, settled] frames. */
const HSEG={};
function hseg(n,s,p,e){HSEG[CI[n]]=[s,p,e];}
hseg('hitL',0,5,26);hseg('hitH',0,6,30);
hseg('hLL',0,9,20);hseg('hLM',0,9,16);hseg('hRL',0,9,15);hseg('hRM',0,12,27);
hseg('uLL',0,7,17);hseg('uLM',0,8,21);hseg('uRL',0,8,17);hseg('uRM',1,7,19);
hseg('kid',0,15,32);hseg('sto',0,9,28);hseg('bhH',0,12,27);
/* punches absorbed on the guard: straights and uppercuts land centre, hooks on the side they come from */
const BSEG={};[['bhN',0,12,24],['bhH',0,12,27],['bLL',0,11,23],['bLH',0,11,26],['bRL',0,12,26],['bRH',0,12,29]].forEach(([n,a,b,c])=>BSEG[CI[n]]=[a,b,c]);
/* Knockdowns. The fall lands face down, mashing pushes you up onto your hands, then the get-up plays out.
   push = how far up mashing can lift you before you rise; sp = playback speed of the rest of the get-up. */
const GETUP={};[['gL',20,1.35],['gM',28,1.35],['gH',34,1.3],['liv',42,1.1]].forEach(([n,push,sp])=>GETUP[CI[n]]={push,sp});
const LIV_KNEEL=22,LIV_HOLD=42,KDF_SP=1.15,TAUNT_SP=1.15;
const fallMs=f=>f.koClip===CI.liv?LIV_KNEEL/0.03:(CL[f.koClip].n-1)/(0.03*KDF_SP);
function downFrame(f,T){if(f.koClip===CI.liv)return Math.min(LIV_HOLD,T<LIV_KNEEL/0.03?T*0.03:LIV_KNEEL+(T-LIV_KNEEL/0.03)*0.008);
  if(f.koClip===CI.kdf)return T<fallMs(f)?-1:GETUP[f.riseClip].push*f.riseP;return Math.min(CL[f.koClip].n-1,T*0.03);}
function blankVis(){const z={};for(const k of ALLK)z[k]=0;z.fc=z.sc=z.fc0=z.sc0=-1;z.fx=z.sx=1;z.a0=-1;z.a1=-1;z.bw=1;z.low=1;z.aw=1;z.gsL=1;z.gsR=1;return z;}
