/* South Paw · data/fighters.js
   The two corners' looks: colours as hex (0xRRGGBB). hair:null means bald. trail is the punch trail colour [r,g,b] from 0 to 1. */
'use strict';
/* The body both boxers use: a character in assets/models (the Superhero, made by tools/anim/superhero.mjs), or 'toon' for the original shapes. */
const FIGHTER_MODEL='superhero';
const FIGHTER_LOOKS=[
  {skin:0xd59a6c,trunks:0xd8302a,trim:0xf4efe4,gloves:0xe0342a,hair:0x1b120d,trail:[1,0.55,0.4]},
  {skin:0x8a5636,trunks:0x1e5bd0,trim:0xffc83a,gloves:0x2b6ef2,hair:null,trail:[0.45,0.65,1]}
];
