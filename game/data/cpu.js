/* South Paw · data/cpu.js
   CPU difficulty levels. Each value is a probability (0-1) unless it says ms.
   react ms before it reacts to your punch, defend chance it defends at all, slip chance it dodges instead of blocking,
   read how much it guards against your usual follow-ups, learn how fast it adapts to your habits, acc chance it reads the punch right,
   aggr how often it throws, combo chance of following up, tmin/tmax ms between decisions, punish chance it punishes your misses,
   mash get-up taps per tick, taunt chance it taunts when well ahead, name shown in the HUD. */
'use strict';
const CPU_LEVELS={
  easy:{react:420,defend:.26,slip:.28,read:.15,learn:.35,acc:.7,aggr:.32,combo:.25,tmin:300,tmax:560,punish:.2,mash:.035,taunt:.05,name:'Tiny Tony'},
  normal:{react:260,defend:.5,slip:.4,read:.4,learn:.7,acc:.85,aggr:.46,combo:.45,tmin:200,tmax:400,punish:.55,mash:.055,taunt:.035,name:'Brick Mahesh'},
  hard:{react:170,defend:.72,slip:.5,read:.7,learn:1,acc:.95,aggr:.58,combo:.65,tmin:130,tmax:260,punish:1,mash:.08,taunt:.025,name:'Diesel Dan'}
};
