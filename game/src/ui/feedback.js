/* South Paw · src/ui/feedback.js
   Asks for a rating after a match (CPU, career or online) and after training: 1 to 5 stars and an optional comment.
   It is a small card over the end screen; "Not now" skips the next three chances, and once you have sent one it does
   not ask again until the next version. Ratings go to CONFIG.feedbackUrl (the Worker in tools/feedback-worker, which
   keeps them in a Cloudflare D1 database). If that cannot be reached they wait on this device (localStorage sp.fbq)
   and go out the next time the game is opened. Nothing personal is sent: the stars, the comment, where you were
   (training or which kind of match), the result, the version, and phone or computer.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const FB={on:false,ctx:'',stars:0,info:null,closeT:0};
const FB_WORDS=['','Bad','Not great','OK','Good','Great'];
const fbGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const fbSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
function fbOpen(){return FB.on;}
/* is it a good moment to ask? */
function fbDue(){if(fbGet('sp.fbSent')===CONFIG.version)return false;
  const skip=+(fbGet('sp.fbSkip')||0);if(skip>0){fbSet('sp.fbSkip',String(skip-1));return false;}return true;}
function fbAsk(ctx){if(FB.on||!fbDue())return;
  FB.ctx=ctx;FB.stars=0;FB.info=fbInfo(ctx);FB.on=true;clearTimeout(FB.closeT);
  $('#fbTitle').textContent=ctx==='training'?'How was the training?':'How was that fight?';
  $('#fbText').value='';$('#fbMsg').textContent='';$('#fbForm').hidden=false;fbDraw();$('#fb').hidden=false;
  if(!usingTouch)setTimeout(()=>{const b=$('#fbStars button');if(b&&FB.on)b.focus({preventScroll:true});},50);}
function fbInfo(ctx){const i={ctx,ver:CONFIG.version,dev:usingTouch?'touch':'keys'};if(ctx==='training'||!S)return i;
  const L=S.mode==='online'?(NET.local|0):0;if(S.matchWinner!=null)i.res=S.matchWinner===L?'win':'loss';
  if(S.career){i.ctx='career';i.opp=S.career.opp;}else if(S.mode==='online')i.ctx='online';else{i.ctx='cpu';i.diff=G.diff||'';}return i;}
function fbDraw(){const w=$('#fbStars');w.innerHTML='';
  for(let n=1;n<=5;n++){const b=document.createElement('button');b.type='button';b.className='fbstar'+(n<=FB.stars?' on':'');b.textContent='★';
    b.setAttribute('role','radio');b.setAttribute('aria-checked',String(n===FB.stars));b.setAttribute('aria-label',n+' star'+(n>1?'s':'')+', '+FB_WORDS[n]);
    b.addEventListener('click',()=>{FB.stars=n;fbDraw();const s=w.children[n-1];if(s)s.focus({preventScroll:true});});w.appendChild(b);}
  $('#fbWord').textContent=FB.stars?FB_WORDS[FB.stars]:'Tap a star';$('#fbSend').disabled=!FB.stars;}
function fbClose(){FB.on=false;$('#fb').hidden=true;clearTimeout(FB.closeT);}
function fbLater(){fbSet('sp.fbSkip','3');fbClose();}
function fbSend(){if(!FB.stars)return;
  const item=Object.assign({},FB.info,{stars:FB.stars,text:$('#fbText').value.trim().slice(0,600),t:Date.now()});
  const q=fbQueue();q.push(item);fbSet('sp.fbq',JSON.stringify(q.slice(-20)));fbSet('sp.fbSent',CONFIG.version);fbSet('sp.fbSkip','0');fbFlush();
  $('#fbForm').hidden=true;$('#fbMsg').textContent='Thank you! Every rating helps us make South Paw better.';
  FB.closeT=setTimeout(fbClose,1800);}
function fbQueue(){try{const q=JSON.parse(fbGet('sp.fbq')||'[]');return Array.isArray(q)?q:[];}catch(e){return [];}}
/* send whatever is waiting; each one leaves the queue only once the server has it */
let fbBusy=false;
function fbFlush(){const url=CONFIG.feedbackUrl;if(!url||fbBusy||!window.fetch)return;const q=fbQueue();if(!q.length)return;fbBusy=true;
  const item=q[0];
  fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(item),keepalive:true}).then(r=>{
    if(r.ok||r.status===400){const now=fbQueue();if(now.length&&now[0].t===item.t)now.shift();fbSet('sp.fbq',JSON.stringify(now));fbBusy=false;if(now.length)fbFlush();}
    else fbBusy=false;}).catch(()=>{fbBusy=false;});}
$('#fbSend').addEventListener('click',fbSend);
$('#fbLater').addEventListener('click',fbLater);
$('#fb').addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();fbLater();return;}
  if(e.target.tagName==='TEXTAREA'){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();fbSend();}return;}
  if(/^[1-5]$/.test(e.key)){FB.stars=+e.key;fbDraw();e.preventDefault();}
  else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){FB.stars=Math.max(1,Math.min(5,(FB.stars||0)+(e.key==='ArrowRight'?1:-1)));fbDraw();const s=$('#fbStars').children[FB.stars-1];if(s)s.focus();e.preventDefault();}});
$('#fb').addEventListener('click',e=>{if(e.target.id==='fb')fbLater();});
setTimeout(fbFlush,4000);
