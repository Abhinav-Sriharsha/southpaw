/* South Paw · src/sim/snapshot.js
   Copies and serialises the fight state (rollback snapshots and online resync).
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= STATE COPYING (snapshots for rollback, JSON for resync) ================= */
function dcopy(v){if(v===null||typeof v!=='object')return v;if(v._ref)return v;
  if(Array.isArray(v)){const a=new Array(v.length);for(let i=0;i<v.length;i++)a[i]=dcopy(v[i]);return a;}
  const o={};for(const k in v)o[k]=dcopy(v[k]);return o;}
const REFS={};
function serState(s){return JSON.stringify(s,(k,v)=>v&&typeof v==='object'&&v._ref?{$r:v._id}:v);}
function deserState(str){return JSON.parse(str,(k,v)=>v&&typeof v==='object'&&v.$r?REFS[v.$r]:v);}
