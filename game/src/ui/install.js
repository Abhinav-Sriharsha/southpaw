/* South Paw · src/ui/install.js
   Installing the game as an app (it then opens full screen from the home screen).
   Android and desktop Chrome: the browser offers installing (beforeinstallprompt); we keep that offer and show our own
   Install button and, on phones, a one-time banner. One tap opens the browser's install box.
   iPhone and iPad: Apple lets no website install itself, so the button and banner explain Share, then Add to Home Screen.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
const INST={evt:null,
  ios:/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),
  installed(){return fsStandalone();},
  seen(){try{return localStorage.getItem('sp.instBar')==='1';}catch(e){return false;}},
  mark(){try{localStorage.setItem('sp.instBar','1');}catch(e){}}};
function instUpdate(){const can=!INST.installed()&&(INST.evt||INST.ios);
  const b=$('#btnInstall');b.hidden=!can;b.textContent=INST.ios?'Add to Home Screen':'Install the app';
  if(!can)$('#instBar').hidden=true;}
function instBar(){if(!TOUCH||INST.installed()||INST.seen()||!(INST.evt||INST.ios))return;
  $('#instText').innerHTML=INST.ios?'Play full screen: tap <b>Share</b>, then <b>Add to Home Screen</b>.':'Play full screen: install South Paw on your home screen.';
  $('#btnInstGo').hidden=INST.ios;$('#btnInstNo').textContent=INST.ios?'Got it':'Not now';$('#instBar').hidden=false;}
function instGo(){INST.mark();$('#instBar').hidden=true;
  if(INST.evt){const e=INST.evt;e.prompt();(e.userChoice||Promise.resolve()).then(()=>{INST.evt=null;instUpdate();}).catch(()=>{});return;}
  if(INST.ios){const h=$('#fsHint');h.innerHTML='Install on iPhone: tap <b>Share</b> (the square with an arrow), then <b>Add to Home Screen</b>. Open South Paw from your home screen to play full screen.';
    h.hidden=false;clearTimeout(instGo.t);instGo.t=setTimeout(()=>{h.hidden=true;},9000);}}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();INST.evt=e;instUpdate();instBar();});
window.addEventListener('appinstalled',()=>{INST.evt=null;instUpdate();});
$('#btnInstall').addEventListener('click',instGo);$('#btnInstGo').addEventListener('click',instGo);
$('#btnInstNo').addEventListener('click',()=>{INST.mark();$('#instBar').hidden=true;});
instUpdate();setTimeout(instBar,2500);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
