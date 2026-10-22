/* South Paw · src/net/online.js
   Online play: PeerJS rooms, quick match queue, rollback netcode, time sync and resync.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= ONLINE: PeerJS rooms + rollback ================= */
const PFX=CONFIG.roomPrefix,QN=CONFIG.quickMatchSlots,ROOM_AB='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RN=1024,SNN=180,MAXPRED=40;
const NET={on:false,peer:null,conn:null,local:0,delay:4,role:'',W:[new Int32Array(RN),new Int32Array(RN)],T:[new Int32Array(RN),new Int32Array(RN)],
  pred:new Int32Array(RN),predT:new Int32Array(RN),snaps:new Array(SNN),snapT:new Int32Array(SNN),contig:-1,remAck:-1,genTo:-1,rb:1e9,
  inbox:[],lastRecv:0,rtt:80,remTick:0,remTickAt:0,nextCk:240,myH:new Map(),remH:new Map(),resyncs:0,rollbacks:0,maxRb:0,acc:0,started:false,
  hello:null,opp:{name:'Rival',style:0},lastPing:0,searching:null,code:'',drift:0,
  confirmedState(){return !this.on||this.contig>=(S.endTick||0)+1;}};
function netReset(){for(let p=0;p<2;p++){NET.T[p].fill(-1);NET.W[p].fill(NEUTRAL);}NET.predT.fill(-1);NET.snapT.fill(-1);NET.contig=-1;NET.remAck=-1;NET.genTo=-1;NET.rb=1e9;
  NET.inbox.length=0;NET.nextCk=240;NET.myH.clear();NET.remH.clear();NET.resyncs=0;NET.rollbacks=0;NET.maxRb=0;NET.acc=0;}
const netStatus=t=>{$('#netStatus').textContent=t;};
function myName(){let n=($('#nameIn').value||'').trim().slice(0,12);if(!n)n='Boxer '+(100+Math.floor(Math.random()*900));try{localStorage.setItem('gj_name',n);}catch(e){}return n;}
function netSend(m){try{if(NET.conn&&NET.conn.open)NET.conn.send(m);}catch(e){}}
function peerOpts(){return Object.assign({debug:0},CONFIG.peerServer||{},window.GJ_PEER||{});}
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
  NET.conn=c;NET.role=role;NET.hello=null;
  c.on('data',m=>onNetData(m));
  c.on('close',()=>{if(NET.conn!==c)return;if(!NET.started){NET.conn=null;if(role==='host')netStatus(NET.qm!==undefined&&NET.peer&&String(NET.peer.id||'').includes(PFX+'q')?'Waiting for an opponent… You are in the queue.':'Waiting for your opponent. Send them the code or the invite link.');return;}onNetLost('Your opponent left the match.');});
  c.on('error',()=>{});
  const hi=()=>{netSend({k:'hello',v:CONFIG.version,name:myName(),style:lookIdx});};
  if(c.open)hi();else c.on('open',hi);
}
function onNetData(m){if(!m||typeof m!=='object')return;NET.lastRecv=performance.now();
  switch(m.k){
    case 'i':case 'c':case 's':NET.inbox.push(m);break;
    case 'p':netSend({k:'q',ts:m.ts});break;
    case 'q':{const r=performance.now()-m.ts;if(r>=0&&r<5000)NET.rtt=NET.rtt*0.8+r*0.2;break;}
    case 'hello':NET.opp={name:String(m.name||'Rival').slice(0,12),style:clamp(m.style|0,0,2)};
      if(NET.role==='host'&&!NET.started){netSend({k:'start',delay:4,names:[myName(),NET.opp.name],styles:[lookIdx,NET.opp.style]});}break;
    case 'start':if(NET.role==='guest'&&!NET.started){netSend({k:'go'});netBegin(1,m.names,m.styles,m.delay);}break;
    case 'go':if(NET.role==='host'&&!NET.started){netBegin(0,[myName(),NET.opp.name],[lookIdx,NET.opp.style],4);}break;
    case 'look':if(NET.on){const st=clamp(m.s|0,0,2);rebuildBoxer(1-NET.local,st);}break;
    case 'busy':break;
    case 'rq':if(NET.on)netDesync(-1);break;
    case 'bye':onNetLost('Your opponent left the match.');break;
  }}
function onNetLost(text){if(!NET.on&&!NET.started){netStatus(text);return;}
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
function hostRoom(){if(!netAvailable())return;closePeer();const code=genCode();NET.code=code;netStatus('Creating a room…');
  const p=new Peer(PFX+code,peerOpts());NET.peer=p;
  p.on('open',()=>{$('#roomCode').textContent=code;$('#roomBox').hidden=false;netStatus('Waiting for your opponent. Send them the code or the invite link.');});
  p.on('connection',c=>acceptHost(c,'Opponent joined. Starting…'));
  p.on('error',err=>{if(err&&err.type==='unavailable-id'){hostRoom();return;}netStatus(peerErrText(err));});}
function joinRoom(code){if(!netAvailable())return;code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(code.length!==4){netStatus('Room codes are 4 letters or numbers.');return;}
  closePeer();netStatus('Joining room '+code+'…');const p=new Peer(peerOpts());NET.peer=p;
  p.on('open',()=>{const c=p.connect(PFX+code,{reliable:false,serialization:'json'});setupConn(c,'guest');});
  p.on('error',err=>netStatus(peerErrText(err)));}
/* --- quick match: open slots on the broker; join a waiting player or wait in a slot yourself --- */
function tryJoin(p,id,ms){return new Promise(res=>{let done=false;const fin=v=>{if(done)return;done=true;p.off&&p.off('error',onErr);res(v);};
  const c=p.connect(id,{reliable:false,serialization:'json'});
  const onErr=err=>{if(err&&err.type==='peer-unavailable'&&String(err.message||'').includes(id))fin(null);};p.on('error',onErr);
  c.on('data',m=>{if(m&&m.k==='busy'){try{c.close();}catch(e){}fin(null);}else if(m&&m.k==='hello'){fin({c,m});}});
  c.on('open',()=>{try{c.send({k:'hello',v:CONFIG.version,name:myName(),style:lookIdx});}catch(e){}});
  setTimeout(()=>{if(!done){try{c.close();}catch(e){}fin(null);}},ms);});}
function openPeer(id){return new Promise(res=>{const p=id?new Peer(id,peerOpts()):new Peer(peerOpts());let done=false;
  p.on('open',()=>{if(!done){done=true;res(p);}});p.on('error',err=>{if(!done){done=true;try{p.destroy();}catch(e){}res({err});}});});}
/* A host only claims a connection once it really opens; the broker also delivers stale requests from players who already gave up */
function acceptHost(c,msg){
  const t=setTimeout(()=>{if(!c.open){try{c.close();}catch(e){}}},4000);
  c.on('open',()=>{clearTimeout(t);if(NET.conn||NET.started){try{c.send({k:'busy'});}catch(e){}setTimeout(()=>{try{c.close();}catch(e){}},300);return;}
    NET.qm=null;setupConn(c,'host');netStatus(msg);});}
function scanAll(p,n,ms){return new Promise(res=>{let left=n,won=null;if(n<=0){res(null);return;}
  for(let i=0;i<n;i++)tryJoin(p,PFX+'q'+i,ms).then(r=>{left--;
    if(r&&!won&&!NET.conn){won=r;res(r);}else if(r){try{r.c.close();}catch(e){}}
    if(left===0&&!won)res(null);});});}
function adoptGuest(p,r){NET.searching=null;NET.qm=null;NET.peer=p;NET.conn=r.c;NET.role='guest';
  r.c.on('data',m=>onNetData(m));r.c.on('close',()=>{if(NET.conn===r.c)onNetLost('Your opponent left the match.');});onNetData(r.m);}
async function quickMatch(){if(!netAvailable())return;closePeer();const myTry=Symbol();NET.qm=myTry;netStatus('Looking for an opponent…');
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
function openOnline(){hideScreens();$('#online').hidden=false;$('#roomBox').hidden=true;try{const n=localStorage.getItem('gj_name');if(n&&!$('#nameIn').value)$('#nameIn').value=n;}catch(e){}}
function cancelOnline(){NET.qm=null;if(!NET.started)closePeer();netStatus('');$('#online').hidden=true;$('#title').hidden=false;}
