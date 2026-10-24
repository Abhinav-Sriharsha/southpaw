/* South Paw · src/net/online.js
   Online play: PeerJS rooms, quick match queue, rollback netcode, time sync and resync.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= ONLINE: PeerJS rooms + rollback ================= */
const PFX=CONFIG.roomPrefix,RPFX=CONFIG.roomIdPrefix||'southpaw-room-',QN=CONFIG.quickMatchSlots,ROOM_AB='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RN=1024,SNN=180,MAXPRED=40;
const NET={on:false,peer:null,conn:null,local:0,delay:4,role:'',W:[new Int32Array(RN),new Int32Array(RN)],T:[new Int32Array(RN),new Int32Array(RN)],
  pred:new Int32Array(RN),predT:new Int32Array(RN),snaps:new Array(SNN),snapT:new Int32Array(SNN),contig:-1,remAck:-1,genTo:-1,rb:1e9,
  inbox:[],lastRecv:0,rtt:80,remTick:0,remTickAt:0,nextCk:240,myH:new Map(),remH:new Map(),resyncs:0,rollbacks:0,maxRb:0,acc:0,started:false,
  hello:null,gotHello:false,badVer:'',startMsg:null,opp:{name:'Rival',style:0},lastPing:0,searching:null,code:'',drift:0,
  confirmedState(){return !this.on||this.contig>=(S.endTick||0)+1;}};
function netReset(){for(let p=0;p<2;p++){NET.T[p].fill(-1);NET.W[p].fill(NEUTRAL);}NET.predT.fill(-1);NET.snapT.fill(-1);NET.contig=-1;NET.remAck=-1;NET.genTo=-1;NET.rb=1e9;
  NET.inbox.length=0;NET.nextCk=240;NET.myH.clear();NET.remH.clear();NET.resyncs=0;NET.rollbacks=0;NET.maxRb=0;NET.acc=0;}
const netStatus=t=>{$('#netStatus').textContent=t;};
function myName(){const el=$('#nameIn');let n=(el.value||'').trim().slice(0,12);
  if(!n){try{n=(localStorage.getItem('gj_name')||'').trim().slice(0,12);}catch(e){}}
  if(!n)n='Boxer '+(100+Math.floor(Math.random()*900));   // picked once, then kept
  if(el.value!==n)el.value=n;try{localStorage.setItem('gj_name',n);}catch(e){}return n;}
function netSend(m){try{if(NET.conn&&NET.conn.open)NET.conn.send(m);}catch(e){}}
/* ICE servers: STUN to find a direct route, TURN relays for networks that block direct connections */
let ICE=CONFIG.iceServers.slice();let iceReady=null;
function prepareIce(){if(iceReady)return iceReady;
  iceReady=(async()=>{const extra=[];
    if(CONFIG.openRelay&&window.crypto&&crypto.subtle){try{const user=(Math.floor(Date.now()/1000)+86400)+':southpaw',enc=new TextEncoder();
      const key=await crypto.subtle.importKey('raw',enc.encode(CONFIG.openRelay.secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
      const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(user)));let bin='';for(const b of sig)bin+=String.fromCharCode(b);
      const h=CONFIG.openRelay.host;extra.push({urls:['turn:'+h+':80','turn:'+h+':443','turn:'+h+':443?transport=tcp','turns:'+h+':443?transport=tcp'],username:user,credential:btoa(bin)});}catch(e){}}
    if(CONFIG.turnUrl){try{const r=await Promise.race([fetch(CONFIG.turnUrl),new Promise((_,rej)=>setTimeout(rej,3000))]);const j=await r.json();if(j&&Array.isArray(j.iceServers))extra.unshift(...j.iceServers);}catch(e){}}
    ICE=extra.concat(CONFIG.iceServers);})();
  return iceReady;}
function peerOpts(){return Object.assign({debug:0,config:{iceServers:ICE}},CONFIG.peerServer||{},window.GJ_PEER||{});}
function netAvailable(){if(!window.Peer||!window.RTCPeerConnection){netStatus("Online play can't run inside this preview window. Open the hosted copy of South Paw to fight online.");return false;}return true;}
function peerErrText(err){const t=err&&err.type;
  if(t==='peer-unavailable')return 'That room code was not found. Check the code and try again.';
  if(t==='unavailable-id')return 'That room is taken.';
  if(t==='browser-incompatible')return "This browser can't do online play.";
  return "Can't reach the matchmaking server. Check your connection, or open the hosted copy of the game.";}
function closePeer(){try{if(NET.conn)NET.conn.close();}catch(e){}try{if(NET.peer)NET.peer.destroy();}catch(e){}NET.conn=null;NET.peer=null;
  if(NET.searching){try{NET.searching.destroy();}catch(e){}NET.searching=null;}}
function netLeave(silent){if(NET.conn)netSend({k:'bye'});NET.on=false;NET.started=false;setTimeout(closePeer,120);if(!silent)netStatus('');}
function genCode(){let s='';for(let i=0;i<4;i++)s+=ROOM_AB[Math.floor(Math.random()*ROOM_AB.length)];return s;}
function setupConn(c,role){
  NET.conn=c;NET.role=role;NET.hello=null;NET.gotHello=false;NET.badVer='';NET.startMsg=null;
  c.on('data',m=>onNetData(m));
  c.on('close',()=>{if(NET.conn!==c)return;if(!NET.started&&LOBBY.on){NET.conn=null;lobbyLost();return;}if(!NET.started){NET.conn=null;if(role==='host')netStatus(NET.qm!==undefined&&NET.peer&&String(NET.peer.id||'').includes(PFX+'q')?'Waiting for an opponent… You are in the queue.':'Waiting for your opponent. Send them the code or the invite link.');return;}onNetLost('Your opponent left the match.');});
  c.on('error',()=>{});
  const hi=()=>netSend(helloMsg());
  if(c.open)hi();else c.on('open',hi);
}
/* The match connection is fast but does not resend lost messages (right for the fight, where inputs are resent anyway).
   So until the fight starts, netPump repeats the lobby messages every 0.4 s until they are answered:
   hello until we have heard theirs (g says whether we have), our Ready state, and the host's start until the guest says go.
   Every handler below is safe to receive twice. */
function helloMsg(){return {k:'hello',v:CONFIG.version,g:NET.gotHello?1:0,name:myName(),style:lookIdx,lk:LOOK.mine()};}   // lk: your fighter's look (null if not customised)
function netPump(){const c=NET.conn;if(!c||!c.open||NET.started)return;
  if(!NET.gotHello)netSend(helloMsg());
  if(LOBBY.on&&LOBBY.opp&&!NET.badVer)netSend({k:'rdy',r:LOBBY.me?1:0});
  if(NET.startMsg&&NET.role==='host')netSend(NET.startMsg);}
setInterval(netPump,400);
function verText(v){return 'Your friend has version '+v+' and you have '+CONFIG.version+'. Both of you reload the page, or close and reopen the app, to get the latest. Then try again.';}
function onNetData(m){if(!m||typeof m!=='object')return;NET.lastRecv=performance.now();
  switch(m.k){
    case 'i':case 'c':case 's':NET.inbox.push(m);break;
    case 'p':netSend({k:'q',ts:m.ts});break;
    case 'q':{const r=performance.now()-m.ts;if(r>=0&&r<5000)NET.rtt=NET.rtt*0.8+r*0.2;break;}
    case 'hello':{const first=!NET.gotHello;NET.gotHello=true;
      if(!m.g)netSend(helloMsg());                 // they have not heard us yet
      if(!first||NET.started)break;
      NET.opp={name:String(m.name||'Rival').slice(0,12),style:clamp(m.style|0,0,2),look:m.lk&&typeof m.lk==='object'?LOOK.clean(m.lk,LOOK.BASE):null};
      if(m.v&&String(m.v)!==CONFIG.version){NET.badVer=String(m.v);
        if(LOBBY.on){LOBBY.opp=true;lobbyRender();lobbyStatus(verText(m.v));}else{netStatus(verText(m.v));NET.qm=null;setTimeout(closePeer,400);}break;}
      if(LOBBY.on){const was=LOBBY.opp;LOBBY.opp=true;lobbyRender();if(!was){lobbyStatus(NET.role==='host'?NET.opp.name+' joined. Press Ready when you are set.':'You are in. Press Ready when you are set.');buzz([20]);}lobbyCheck();break;}
      if(NET.role==='host'){NET.startMsg={k:'start',delay:4,names:[myName(),NET.opp.name],styles:[lookIdx,NET.opp.style]};netSend(NET.startMsg);}break;}
    case 'rdy':if(LOBBY.on&&!NET.badVer){const r=!!m.r;if(r!==LOBBY.oppReady){LOBBY.oppReady=r;lobbyRender();}lobbyCheck();}break;
    case 'start':if(NET.role==='guest'&&!NET.badVer){netSend({k:'go'});if(!NET.started){lobbyClose();netBegin(1,m.names,m.styles,m.delay);}}break;
    case 'go':if(NET.role==='host'){NET.startMsg=null;if(!NET.started){lobbyClose();netBegin(0,[myName(),NET.opp.name],[lookIdx,NET.opp.style],4);}}break;
    case 'look':if(NET.on){const st=clamp(m.s|0,0,2);rebuildBoxer(1-NET.local,st);}break;
    case 'busy':break;
    case 'rq':if(NET.on)netDesync(-1);break;
    case 'bye':onNetLost('Your opponent left the match.');break;
  }}
function onNetLost(text){if(LOBBY.on&&!NET.started){lobbyLost();return;}if(!NET.on&&!NET.started){netStatus(text);return;}
  NET.on=false;NET.started=false;closePeer();startAttract();openOnline();netStatus(text);}
function netBegin(local,names,styles,delay){
  NET.started=true;NET.on=true;NET.local=local;NET.delay=clamp(delay|0,2,8);netReset();
  if(NET.peer&&NET.peer.disconnect){try{NET.peer.disconnect();}catch(e){}}  // free the room code; the match connection stays up
  const s=newSim('online',{names:[String(names[0]).slice(0,12),String(names[1]).slice(0,12)]});enterSim(s);
  rebuildBoxer(0,clamp(styles[0]|0,0,2));rebuildBoxer(1,clamp(styles[1]|0,0,2));
  startRoundS();
  for(let t=0;t<NET.delay;t++){NET.W[local][t%RN]=NEUTRAL;NET.T[local][t%RN]=t;}NET.genTo=NET.delay-1;
  NET.lastRecv=performance.now();NET.remTick=0;NET.remTickAt=performance.now();
  beginMode();}
function saveSnap(t){NET.snaps[t%SNN]=dcopy(S);NET.snapT[t%SNN]=t;}
function netStepTick(gen){
  const T=S.tick,L=NET.local,R=1-L;
  if(gen){const g=T+NET.delay;if(NET.genTo<g){for(let t=NET.genTo+1;t<=g;t++){NET.W[L][t%RN]=t===g?sampleLocal():NET.W[L][NET.genTo%RN]&EDGE_MASK;NET.T[L][t%RN]=t;}NET.genTo=g;}}
  saveSnap(T);
  const lw=NET.T[L][T%RN]===T?NET.W[L][T%RN]:NEUTRAL;
  let rw;if(NET.T[R][T%RN]===T){rw=NET.W[R][T%RN];NET.predT[T%RN]=-1;}
  else{const base=NET.contig>=0?NET.W[R][NET.contig%RN]:NEUTRAL;rw=base&EDGE_MASK;NET.pred[T%RN]=rw;NET.predT[T%RN]=T;}
  step(L===0?[lw,rw]:[rw,lw]);
}
function netProcessInbox(){
  const R=1-NET.local;
  for(const m of NET.inbox){
    if(m.k==='i'){
      NET.remTick=m.t;NET.remTickAt=performance.now();if(m.a>NET.remAck)NET.remAck=m.a;
      const w=m.w||[];for(let j=0;j<w.length;j++){const t=m.s+j;if(t<0)continue;const ix=t%RN;if(NET.T[R][ix]===t)continue;if(t<=NET.contig)continue;
        NET.W[R][ix]=w[j]|0;NET.T[R][ix]=t;
        if(t<S.tick&&NET.predT[ix]===t&&NET.pred[ix]!==(w[j]|0)){if(t<NET.rb)NET.rb=t;}}
      while(NET.T[R][(NET.contig+1)%RN]===NET.contig+1)NET.contig++;
    }else if(m.k==='c'){const mine=NET.myH.get(m.t);if(mine===undefined)NET.remH.set(m.t,m.h);else if(mine!==m.h)netDesync(m.t);}
    else if(m.k==='s'){if(NET.local===1)netApplySync(m);}
  }
  NET.inbox.length=0;}
function netDesync(t){if(NET.local!==0)return;let tt=t,ix=tt%SNN;if(NET.snapT[ix]!==tt){tt=Math.min(S.tick,NET.contig+1);ix=tt%SNN;}if(NET.snapT[ix]===tt)netSend({k:'s',t:tt,st:serState(NET.snaps[ix])});}
function netApplySync(m){const target=S.tick;if(m.t>target)return;NET.resyncs++;S=deserState(m.st);while(S.tick<target)netStepTick(false);}
function netRollback(){
  if(NET.rb>=S.tick){NET.rb=1e9;return;}
  const t0=NET.rb,target=S.tick;NET.rb=1e9;const ix=t0%SNN;
  if(NET.snapT[ix]!==t0){netSend({k:'rq'});return;}
  S=dcopy(NET.snaps[ix]);NET.rollbacks++;NET.maxRb=Math.max(NET.maxRb,target-t0);
  while(S.tick<target)netStepTick(false);}
function netChecksums(){
  while(NET.contig>=NET.nextCk-1&&S.tick>NET.nextCk){
    const t=NET.nextCk,ix=t%SNN;NET.nextCk+=240;
    if(NET.snapT[ix]!==t)continue;const h=simHash(NET.snaps[ix]);NET.myH.set(t,h);netSend({k:'c',t,h});
    const r=NET.remH.get(t);if(r!==undefined&&r!==h)netDesync(t);
    if(NET.myH.size>40){const k0=NET.myH.keys().next().value;NET.myH.delete(k0);NET.remH.delete(k0);}}}
function netFrame(dt){
  const now=performance.now();
  netProcessInbox();netRollback();netChecksums();
  const est=NET.remTick+(now-NET.remTickAt)/STEP+(NET.rtt/2)/STEP;
  NET.drift=S.tick-est;
  NET.acc+=dt;let n=Math.floor(NET.acc/STEP);NET.acc-=n*STEP;if(n>10){n=10;NET.acc=0;}
  if(NET.drift>2&&n>0)n--;else if(NET.drift<-4)n++;
  for(let i=0;i<n;i++){if(S.tick-NET.contig>MAXPRED)break;netStepTick(true);}
  const L=NET.local,from=Math.max(NET.remAck+1,NET.genTo-120,0),w=[];for(let t=from;t<=NET.genTo;t++)w.push(NET.W[L][t%RN]);
  netSend({k:'i',t:S.tick,a:NET.contig,s:from,w});
  if(now-NET.lastPing>1000){NET.lastPing=now;netSend({k:'p',ts:now});const pe=$('#ping');pe.textContent=Math.round(NET.rtt)+' ms';pe.classList.toggle('bad',NET.rtt>160);}
  if(now-NET.lastRecv>5000)onNetLost('Connection lost. The match ended.');
}
/* --- rooms --- */
async function hostRoom(){if(!netAvailable())return;closePeer();NET.qm=null;const code=genCode();NET.code=code;netStatus('Creating a room…');
  await prepareIce();
  const p=new Peer(RPFX+code,peerOpts());NET.peer=p;NET.role='host';
  p.on('open',()=>{if(NET.peer!==p)return;if(!LOBBY.on){lobbyOpen('host',code);lobbyStatus('Send the invite link to a friend. Keep this screen open until they join.');}else lobbyStatus('Back online. Waiting for your friend…');});
  p.on('connection',c=>acceptHost(c,''));
  p.on('disconnected',()=>{if(NET.peer===p&&!NET.started)setTimeout(()=>{try{if(NET.peer===p&&p.disconnected&&!p.destroyed)p.reconnect();}catch(e){}},800);});
  p.on('error',err=>{if(err&&err.type==='unavailable-id'&&!LOBBY.on){hostRoom();return;}if(err&&(err.type==='network'||err.type==='server-error'||err.type==='socket-error'||err.type==='socket-closed'))return;
    if(LOBBY.on)lobbyStatus(peerErrText(err));else netStatus(peerErrText(err));});}
async function joinRoom(code){if(!netAvailable())return;code=cleanCode(code);const bad=codeProblem(code);if(bad){if(LOBBY.on)lobbyClose(),openOnline();netStatus(bad);return;}
  if(NET.started)return;$('#codeIn').value=code;
  closePeer();NET.qm=null;NET.code=code;NET.role='guest';lobbyOpen('guest',code);lobbyStatus('Connecting to room '+code+'…');
  await prepareIce();if(!LOBBY.on||LOBBY.code!==code)return;
  const p=new Peer(peerOpts());NET.peer=p;let tries=0,cur=0,pend=null;
  // keep knocking: the host may still be connecting, or switched apps to send the link and just came back.
  // Only one attempt is ever open, so the host never ends up holding a different connection from the one we use.
  const attempt=()=>{if(NET.peer!==p||NET.started||(NET.conn&&NET.conn.open))return;const id=++cur;tries++;
    if(pend){try{pend.close();}catch(e){}pend=null;}
    const c=p.connect(RPFX+code,{reliable:false,serialization:'json'});pend=c;let ok=false;
    const take=()=>{if(ok)return;if(NET.peer!==p||(NET.conn&&NET.conn.open&&NET.conn!==c)){try{c.close();}catch(e){}return;}
      ok=true;pend=null;cur++;setupConn(c,'guest');lobbyStatus('Connected. Saying hello…');};
    c.on('open',take);
    const isOpen=()=>c.open||(c.dataChannel&&c.dataChannel.readyState==='open');
    setTimeout(()=>{if(ok||NET.peer!==p||NET.started)return;if(isOpen()){take();return;}if(id===cur)next();},15000);};
  const next=()=>{if(tries>=10){lobbyStatus("Couldn't reach room "+code+". Check the code, and ask your friend to keep South Paw open on the room screen.");$('#btnLobRetry').hidden=false;return;}
    lobbyStatus(tries<2?'Still connecting…':'Waiting for the host. They need South Paw open on the room screen. Trying again…');setTimeout(attempt,1500);};
  LOBBY.retry=()=>{tries=0;$('#btnLobRetry').hidden=true;lobbyStatus('Connecting to room '+code+'…');attempt();};
  p.on('open',attempt);
  p.on('disconnected',()=>{if(NET.peer===p&&!NET.started)setTimeout(()=>{try{if(NET.peer===p&&p.disconnected&&!p.destroyed)p.reconnect();}catch(e){}},800);});
  p.on('error',err=>{if(NET.peer!==p)return;if(err&&err.type==='peer-unavailable'){cur++;next();return;}
    if(err&&(err.type==='network'||err.type==='socket-error'||err.type==='socket-closed'))return;lobbyStatus(peerErrText(err));});}
/* --- quick match: open slots on the broker; join a waiting player or wait in a slot yourself --- */
function tryJoin(p,id,ms){return new Promise(res=>{let done=false;const fin=v=>{if(done)return;done=true;p.off&&p.off('error',onErr);res(v);};
  const c=p.connect(id,{reliable:false,serialization:'json'});
  const onErr=err=>{if(err&&err.type==='peer-unavailable'&&String(err.message||'').includes(id))fin(null);};p.on('error',onErr);
  c.on('data',m=>{if(m&&m.k==='busy'){try{c.close();}catch(e){}fin(null);}else if(m&&m.k==='hello'){fin({c,m});}});
  c.on('open',()=>{try{c.send({k:'hello',v:CONFIG.version,name:myName(),style:lookIdx,lk:LOOK.mine()});}catch(e){}});
  setTimeout(()=>{if(!done){try{c.close();}catch(e){}fin(null);}},ms);});}
function openPeer(id){return new Promise(res=>{const p=id?new Peer(id,peerOpts()):new Peer(peerOpts());let done=false;
  p.on('open',()=>{if(!done){done=true;res(p);}});p.on('error',err=>{if(!done){done=true;try{p.destroy();}catch(e){}res({err});}});});}
/* A host only claims a connection once it really opens; the broker also delivers stale requests from players who already gave up */
function acceptHost(c,msg){
  const t=setTimeout(()=>{if(!c.open){try{c.close();}catch(e){}}},20000);
  c.on('open',()=>{clearTimeout(t);
    if(!NET.started&&LOBBY.on&&NET.conn&&NET.conn!==c&&NET.conn.peer===c.peer){const old=NET.conn;NET.conn=null;try{old.close();}catch(e){}setupConn(c,'host');return;}  // the same friend reconnected: use the newest line
    if(NET.conn||NET.started){try{c.send({k:'busy'});}catch(e){}setTimeout(()=>{try{c.close();}catch(e){}},300);return;}
    NET.qm=null;setupConn(c,'host');if(msg)netStatus(msg);else lobbyStatus('Your friend is connecting…');});}
function scanAll(p,n,ms){return new Promise(res=>{let left=n,won=null;if(n<=0){res(null);return;}
  for(let i=0;i<n;i++)tryJoin(p,PFX+'q'+i,ms).then(r=>{left--;
    if(r&&!won&&!NET.conn){won=r;res(r);}else if(r){try{r.c.close();}catch(e){}}
    if(left===0&&!won)res(null);});});}
function adoptGuest(p,r){NET.searching=null;NET.qm=null;NET.peer=p;NET.conn=r.c;NET.role='guest';
  r.c.on('data',m=>onNetData(m));r.c.on('close',()=>{if(NET.conn===r.c)onNetLost('Your opponent left the match.');});onNetData(r.m);}
async function quickMatch(){if(!netAvailable())return;closePeer();lobbyClose();const myTry=Symbol();NET.qm=myTry;netStatus('Looking for an opponent…');await prepareIce();if(NET.qm!==myTry)return;
  const p0=await openPeer(null);if(p0.err){netStatus(peerErrText(p0.err));return;}if(NET.qm!==myTry){p0.destroy();return;}
  NET.searching=p0;const r0=await scanAll(p0,QN,2600);
  if(r0&&NET.qm===myTry){adoptGuest(p0,r0);return;}
  try{p0.destroy();}catch(e){}NET.searching=null;if(NET.qm!==myTry)return;
  for(let i=0;i<QN;i++){if(NET.qm!==myTry)return;const p=await openPeer(PFX+'q'+i);if(p.err){if(p.err.type==='unavailable-id')continue;netStatus(peerErrText(p.err));return;}
    NET.peer=p;netStatus('Waiting for an opponent… You are in the queue.');
    p.on('connection',c=>acceptHost(c,'Opponent found. Starting…'));
    p.on('error',()=>{});
    // two players can end up waiting in different slots; the one in the higher slot keeps checking the lower ones
    const recheck=async()=>{if(NET.qm!==myTry||NET.conn)return;
      if(i>0){const ps=await openPeer(null);if(!ps.err){NET.searching=ps;const r=await scanAll(ps,i,2600);
        if(r&&NET.qm===myTry&&!NET.conn){try{p.destroy();}catch(e){}adoptGuest(ps,r);return;}try{ps.destroy();}catch(e){}NET.searching=null;}}
      if(NET.qm===myTry&&!NET.conn)setTimeout(recheck,1800+Math.random()*2200);};
    setTimeout(recheck,800+Math.random()*1500);return;}
  netStatus('The queue is full right now. Try again in a moment.');}
function closePeerKeep(){try{if(NET.peer)NET.peer.destroy();}catch(e){}NET.peer=null;}
function openOnline(){hideScreens();lobbyClose();$('#online').hidden=false;$('#roomBox').hidden=true;prepareIce();try{const n=localStorage.getItem('gj_name');if(n&&!$('#nameIn').value)$('#nameIn').value=n;}catch(e){}}
function cancelOnline(){NET.qm=null;if(!NET.started)closePeer();netStatus('');$('#online').hidden=true;$('#title').hidden=false;}

/* ================= PRIVATE ROOM LOBBY =================
   Create room -> you wait in the lobby with an invite link. Your friend opens the link and lands in the same lobby.
   When both press Ready, the host starts the match. Red corner = the host, blue corner = the guest. */
const LOBBY={on:false,role:'',code:'',me:false,opp:false,oppReady:false,starting:false,retry:null};
function lobbyLink(){return location.origin+location.pathname+'#'+LOBBY.code;}
/* The invite carries the code as well as the link: a friend who plays from the home-screen app opens the app and types it,
   or taps Paste invite on the online screen. */
function inviteText(){return 'Fight me on South Paw! Room code '+LOBBY.code+' \u2022 '+lobbyLink();}
/* Room codes never use 0, O, 1, I or L. Clean up whatever was typed or pasted; return the 4-letter code or ''. */
function cleanCode(t){t=String(t||'').toUpperCase();const m=t.match(/#([A-Z0-9]{4})\b/)||t.match(/ROOM(?: CODE)?\s*([A-Z0-9]{4})\b/)||t.match(/^\s*([A-Z0-9]{4})\s*$/);
  return m?m[1]:t.replace(/[^A-Z0-9]/g,'').slice(0,4);}
function codeProblem(c){if(c.length!==4)return 'Room codes are 4 letters or numbers.';if(/[0O1IL]/.test(c))return 'Room codes never use 0, O, 1, I or L. Check the code your friend sent.';return '';}
function lobbyOpen(role,code){Object.assign(LOBBY,{on:true,role,code,me:false,opp:false,oppReady:false,starting:false,retry:null});
  hideScreens();$('#lobby').hidden=false;$('#lobCode').textContent=code;$('#lobInvite').hidden=role!=='host';$('#btnLobRetry').hidden=true;
  $('#btnLobShare').hidden=!navigator.share;lobbyRender();}
function lobbyClose(){LOBBY.on=false;LOBBY.starting=false;const el=$('#lobby');if(el)el.hidden=true;}
function lobbyStatus(t){$('#lobStatus').textContent=t;}
function lobbyRender(){const host=LOBBY.role==='host',me=myName(),opp=LOBBY.opp?NET.opp.name:(host?'Waiting for a friend…':'Connecting…');
  const red=host?{n:me,you:true,r:LOBBY.me,on:true}:{n:opp,you:false,r:LOBBY.oppReady,on:LOBBY.opp};
  const blue=host?{n:opp,you:false,r:LOBBY.oppReady,on:LOBBY.opp}:{n:me,you:true,r:LOBBY.me,on:true};
  for(const [k,v] of [['Red',red],['Blue',blue]]){$('#lob'+k+'Name').textContent=v.n+(v.you?' (you)':'');
    const st=$('#lob'+k+'State');st.textContent=!v.on?'':v.r?'Ready':'Not ready';st.classList.toggle('ok',!!v.r);$('#lob'+k).classList.toggle('empty',!v.on);}
  const b=$('#btnReady');b.disabled=!LOBBY.opp||LOBBY.starting||!!NET.badVer;b.textContent=LOBBY.me?'Not ready':'Ready';b.classList.toggle('primary',!LOBBY.me);}
function lobbySetReady(r){if(!LOBBY.on||!LOBBY.opp||LOBBY.starting||NET.badVer)return;LOBBY.me=r;netSend({k:'rdy',r:r?1:0});lobbyRender();
  lobbyStatus(r?(LOBBY.oppReady?'Both ready…':'Waiting for '+NET.opp.name+' to press Ready.'):'Press Ready when you are set.');lobbyCheck();}
function lobbyCheck(){if(!LOBBY.on)return;if(LOBBY.me&&LOBBY.oppReady){lobbyStatus('Both ready. Starting the fight…');
    if(NET.role==='host'&&!LOBBY.starting&&!NET.started){LOBBY.starting=true;lobbyRender();
      setTimeout(()=>{if(LOBBY.on&&LOBBY.me&&LOBBY.oppReady&&NET.conn&&NET.conn.open&&!NET.started){NET.startMsg={k:'start',delay:4,names:[myName(),NET.opp.name],styles:[lookIdx,NET.opp.style]};netSend(NET.startMsg);}else{LOBBY.starting=false;lobbyRender();}},700);}}
  else if(LOBBY.oppReady)lobbyStatus(NET.opp.name+' is ready. Press Ready to start.');}
function lobbyLost(){LOBBY.opp=false;LOBBY.oppReady=false;LOBBY.me=false;LOBBY.starting=false;NET.startMsg=null;NET.badVer='';lobbyRender();
  lobbyStatus(LOBBY.role==='host'?'Your friend left. The room is still open: send the link again.':'The host closed the room.');}
function lobbyLeave(){if(NET.conn)netSend({k:'bye'});lobbyClose();NET.on=false;NET.started=false;setTimeout(closePeer,120);openOnline();netStatus('');}
function lobbyCopy(btn){const link=lobbyLink(),text=inviteText();const done=()=>{btn.textContent='Copied';setTimeout(()=>{btn.textContent='Copy invite link';},1600);};
  const fallback=()=>{const i=$('#lobLink');i.hidden=false;i.value=link;i.select();};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(done).catch(fallback);else fallback();}
// coming back to the browser after sending the link: make sure the room is still reachable
document.addEventListener('visibilitychange',()=>{if(document.hidden||NET.started)return;const p=NET.peer;try{if(p&&p.disconnected&&!p.destroyed)p.reconnect();}catch(e){}});
