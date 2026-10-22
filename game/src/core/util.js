/* South Paw · src/core/util.js
   Small helpers, deterministic maths for the fight sim, touch detection.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const easeOut=t=>1-(1-t)*(1-t)*(1-t);
const easeIn=t=>t*t;
const easeInOut=t=>{if(t<.5)return 2*t*t;const u=-2*t+2;return 1-u*u/2;};
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t);};
const wrapA=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
/* Deterministic math for the fight simulation. Browsers may differ in the last bit of Math.sin/exp/atan2,
   which would slowly split two online players' fights apart, so the sim only uses + - * / and sqrt through these. */
const PIO2_1=1.57079632673412561417,PIO2_1T=6.07710050650619224932e-11,INV_PIO2=0.63661977236758134308;
function ksin(x){const z=x*x;return x+x*z*(-1.66666666666666324348e-01+z*(8.33333333332248946124e-03+z*(-1.98412698298579493134e-04+z*(2.75573137070700676789e-06+z*(-2.50507602534068634195e-08+z*1.58969099521155010221e-10)))));}
function kcos(x){const z=x*x;return 1-0.5*z+z*z*(4.16666666666666019037e-02+z*(-1.38888888888741095749e-03+z*(2.48015872894767294178e-05+z*(-2.75573143513906633035e-07+z*(2.08757232129817482790e-09+z*-1.13596475577881948265e-11)))));}
function dsin(x){const k=Math.round(x*INV_PIO2),r=(x-k*PIO2_1)-k*PIO2_1T,q=((k%4)+4)%4;return q===0?ksin(r):q===1?kcos(r):q===2?-ksin(r):-kcos(r);}
function dcos(x){const k=Math.round(x*INV_PIO2),r=(x-k*PIO2_1)-k*PIO2_1T,q=((k%4)+4)%4;return q===0?kcos(r):q===1?-ksin(r):q===2?-kcos(r):ksin(r);}
function datan(x){const neg=x<0;if(neg)x=-x;let inv=false,off=0;if(x>1){x=1/x;inv=true;}
  if(x>0.2679491924311227){x=(x*1.7320508075688772-1)/(1.7320508075688772+x);off=0.5235987755982988;}
  const z=x*x;let r=off+x*(1+z*(-0.3333333333333333+z*(0.2+z*(-0.14285714285714285+z*(0.1111111111111111+z*(-0.09090909090909091+z*(0.07692307692307693+z*(-0.06666666666666667+z*0.058823529411764705))))))));
  if(inv)r=1.5707963267948966-r;return neg?-r:r;}
function datan2(y,x){if(x>0)return datan(y/x);if(x<0)return y>=0?datan(y/x)+3.141592653589793:datan(y/x)-3.141592653589793;return y>0?1.5707963267948966:y<0?-1.5707963267948966:0;}
function dexp(x){if(x<-700)return 0;if(x>700)x=700;const k=Math.round(x*1.4426950408889634),r=(x-k*0.6931471803691238)-k*1.9082149292705877e-10;
  let e=1+r*(1+r*(0.5+r*(0.16666666666666666+r*(0.041666666666666664+r*(0.008333333333333333+r*(0.001388888888888889+r*(0.0001984126984126984+r*(0.0000248015873015873+r*(0.0000027557319223985893+r*2.755731922398589e-7)))))))));
  let n=k;while(n>0){e*=2;n--;}while(n<0){e*=0.5;n++;}return e;}
const dhyp=(a,b)=>Math.sqrt(a*a+b*b);
const reduceMotion=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!window.THREE){$('.tag').textContent='The 3D engine failed to load. Check your connection and reload the page.';throw new Error('three.js did not load');}
const V3=THREE.Vector3;
const TOUCH=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||('ontouchstart' in window&&navigator.maxTouchPoints>0);
