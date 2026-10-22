/* South Paw · data/rules.js
   The fight rules from south-paw-mechanics.xlsx. Tune balance here, then bump CONFIG.version in data/config.js.
   Both online players must run the same numbers, so never change these for one player only. */
'use strict';
const RULES={
  /* Punches: [health damage on a clean hit, stamina cost, power shot (1 = breaks a guard by itself), opponent stamina drained]
     L = left hand, R = right hand. 0 jab/cross, 1 hook (R1L = long right hook from range), 2 uppercut (2s = short range),
     3 power uppercut, 4 body straight, 5 body hook. Rc is the cross thrown straight after a jab. */
  punches:{
    L0:[5,8], L1:[10,15], L2:[12,18], L2s:[12,18], L3:[18,28,1], L3s:[18,28,1], L4:[6,9], L5:[10,16,0,15],
    R0:[7,10], Rc:[7,10], R1:[10,15], R1L:[15,24,1], R2:[12,18], R2s:[12,18], R3:[18,28,1], R3s:[18,28,1], R4:[6,9], R5:[10,16,0,15]
  },
  ROUND_SECONDS:60,  // length of a round
  ROUNDS_TO_WIN:2,  // rounds needed to win the match (2 = best of 3)
  HP0:100,          // health at the start of every round
  ST0:100,          // stamina at the start of every round
  ST_RATE:25,       // stamina refilled per second
  ST_DELAY:500,     // ms after your last punch before stamina starts refilling
  ST_BLOCK:0.5,     // refill speed while blocking (x normal)
  GAS_UNLOCK:30,    // when gassed (stamina 0) you can't punch until stamina is back to this
  GUARD_HITS:3,     // blocked normal shots in a row that break the guard (a power shot counts as all 3). Hidden from the player
  GUARD_HEAL:2000,  // ms without a blocked hit before one blocked hit is forgiven
  GB_STUN:700,      // ms a fighter is wide open after a guard break
  CTR:1.5,          // counter damage multiplier
  KD_HP:40,         // health after getting up from the one knockdown allowed per round (the second is a TKO)
  KD_ST:50,         // stamina after getting up
  KD_TAPS:12,       // taps needed to get up before the count of 10
  WOB_MS:1500       // ms of wobble after getting up
};
