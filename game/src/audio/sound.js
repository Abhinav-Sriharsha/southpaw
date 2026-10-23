/* South Paw · src/audio/sound.js
   Sound engine: plays the recorded sounds listed in data/sounds.js.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= SOUND: only the recorded sounds supplied for the game =================
   punch (jabs, crosses), face (hooks, uppercuts, counters), body (body shots), bell (round start), bellEnd (time, knockouts),
   cheer, react2 (big moments), livko (knockdowns, liver shots, knockouts), introAmb (before and between rounds), roundAmb (during a round). */
/* Where the hit actually sounds in each recording (seconds). Playback starts there, so the smack lands on the contact frame.
   Measured from the files: punch hits at once, face and body have about 0.1 s of lead-in. Re-measure if you swap a file. */
const SND_HIT={punch:0.012,face:0.085,body:0.105};
const Sfx={buf:{},ctx:null,on:true,master:null,muffle:null,fx:null,crowd:null,amb:{},danger:0,rl:{},ambT:0,voice:null,
  ok(){return !!this.ctx&&G.mode!=='attract';},
  /* Phones pause audio when the app is switched or a call or notification interrupts it (iPhone calls this 'interrupted').
     wake() restarts it; it runs on every tap and when the page comes back. */
  wake(){const c=this.ctx;if(c&&c.state!=='running'&&c.state!=='closed'){try{const p=c.resume();if(p&&p.catch)p.catch(()=>{});
      const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);}catch(e){}}},   // the silent blip unlocks older iPhones
  init(){
    if(this.ctx){this.wake();return;}
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}   // iPhone: play like a video, even with the silent switch on
      const c=new AC();this.ctx=c;
      this.master=c.createGain();this.master.gain.value=this.on?1:0;
      this.muffle=c.createBiquadFilter();this.muffle.type='lowpass';this.muffle.frequency.value=20000;this.muffle.Q.value=0.5;
      const comp=c.createDynamicsCompressor();comp.threshold.value=-8;comp.knee.value=6;comp.ratio.value=3;comp.attack.value=0.002;comp.release.value=0.15;
      this.master.connect(this.muffle);this.muffle.connect(comp);comp.connect(c.destination);
      this.fx=c.createGain();this.fx.gain.value=1;this.fx.connect(this.master);            // punches and bells: always on top
      this.crowd=c.createGain();this.crowd.gain.value=1;this.crowd.connect(this.master);    // crowd and ambience: ducks under every punch
      this.loadSamples();
    }catch(e){this.ctx=null;}
  },
  loadSamples(){for(const k in SOUND_FILES){fetch(SOUND_FILES[k]).then(r=>r.ok?r.arrayBuffer():null).then(ab=>{if(!ab)return;
      const done=b=>{this.buf[k]=b;if(k==='introAmb'||k==='roundAmb')this.startAmb(k);},pr=this.ctx.decodeAudioData(ab,done,()=>{});if(pr&&pr.catch)pr.catch(()=>{});}).catch(()=>{});}},
  toggle(){this.on=!this.on;if(this.ctx)this.master.gain.setTargetAtTime(this.on?1:0,this.ctx.currentTime,0.02);return this.on;},
  play(k,vol,rate,dest,when,off,dur){const b=this.buf[k];if(!b||!this.ctx)return null;const c=this.ctx,s=c.createBufferSource();s.buffer=b;s.playbackRate.value=rate||1;
    const g=c.createGain(),t=when||c.currentTime;s.connect(g);g.connect(dest||this.fx);
    if(dur){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol),t+0.15);g.gain.setValueAtTime(Math.max(0.0002,vol),t+Math.max(0.16,dur-0.6));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.start(t,off||0,dur+0.05);}
    else{g.gain.value=vol;s.start(t,off||0);}this.lastG=g;return s;},
  pan(p){const c=this.ctx;if(p&&c.createStereoPanner){const n=c.createStereoPanner();n.pan.value=clamp(p,-0.6,0.6);n.connect(this.fx);return n;}return this.fx;},
  duck(d){const c=this.ctx,t=c.currentTime,g=this.crowd.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(d,t+0.01);g.setTargetAtTime(1,t+0.12,0.18);},
  /* ---- punches: every landed or blocked punch makes a sound, and the crowd dips under it ---- */
  /* Same punch, same sound: the sample, loudness and pitch follow the shot type and power only (no random pitch). */
  punch(e,pan){if(!this.ok())return;this.wake();const p=clamp(e.p||0.3,0,1),dest=this.pan(pan),H=SND_HIT;
    if(e.blk){this.duck(0.8);const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;f.connect(dest);
      this.play('punch',0.65,0.85,f,0,H.punch);return;}
    this.duck(0.6-0.15*p);
    const body=e.target==='body',k=e.kind||'straight',combo=Math.min(e.combo||1,6),big=k==='hook'||k==='upper'||e.label==='Counter'||p>0.75;
    const r=1+0.02*(combo-1);
    if(body)this.play('body',1.0+p*0.3,r,dest,0,H.body);
    else if(big)this.play('face',1.55+p*0.35,r,dest,0,H.face);
    else this.play('punch',0.9+p*0.3,r,dest,0,H.punch);
    if(e.label==='Counter'){const c=this.ctx,d=c.createDelay();d.delayTime.value=0.05;const g=c.createGain();g.gain.value=0.3;d.connect(g);g.connect(dest);
      big?this.play('face',0.9,r,d,0,H.face):this.play('punch',0.8,r,d,0,H.punch);}},
  swish(){},whiff(){},step(){},block(){},count(){},
  bell(n){if(!this.ok())return;if(n===1){this.play('bell',0.9);return;}this.play('bellEnd',n===3?1:0.9);if(n===3)this.play('bellEnd',0.8,1,null,this.ctx.currentTime+0.9);},
  knockdown(){if(!this.ok())return;this.react('ko',1);},
  boom(){if(!this.ok())return;this.react('ko',1.2,9.5);},
  /* ---- the crowd: one reaction at a time, so reactions never pile up into mush ----
     A bigger moment cuts in over a smaller one (fading it out quickly); a smaller one waits until the current one is over.
     Each reaction always uses the loud part of its recording (measured: react2 0.25-2 s, livko peaks from 2.5 s, cheer is even). */
  REACT:{ooh:{pri:1,gap:0.7,file:'react2',off:0.25,dur:1.8,vol:0.95},
    cheer:{pri:2,gap:1.2,file:'cheer',off:-1,dur:1.8,vol:0.85},
    gasp:{pri:3,gap:0.9,file:'react2',off:0.2,dur:2.2,vol:1.0},
    roar:{pri:4,gap:1.6,file:'livko',off:2.4,dur:3,vol:0.9},
    ko:{pri:5,gap:2.5,file:'livko',off:2.2,dur:7.5,vol:1.0}},
  react(type,s,dur,delay){if(!this.ok())return;const R=this.REACT[type];if(!R)return;const c=this.ctx,B=this.buf[R.file];if(!B)return;
    if(delay){setTimeout(()=>this.react(type,s,dur),delay*1000);return;}
    const t=c.currentTime+0.06;s=clamp(s||0.6,0.1,1.4);                       // a crowd answers a beat after the punch
    const lt=this.rl[type]||-9;if(t-lt<R.gap&&R.pri<5)return;
    const v=this.voice;if(v&&t<v.end){if(R.pri<v.pri)return;v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0.0001,t,0.05);try{v.src.stop(t+0.3);}catch(e){}}
    const want=dur||R.dur,off=R.off>=0?Math.min(R.off,Math.max(0,B.duration-1.2)):0.3+((this.rl.n=(this.rl.n||0)+1)*2.9)%Math.max(0.1,B.duration-want-1.3);
    const d=Math.max(0.8,Math.min(want,B.duration-off-0.1));
    this.rl[type]=t;const src=this.play(R.file,R.vol*s,1,this.crowd,t,off,d);if(!src)return;
    this.voice={src,g:this.lastG,pri:R.pri,end:t+d-0.4};},
  applause(dur,s){this.react('cheer',s||0.6,Math.max(1.5,dur||2));},
  /* ---- ambience: the walk-in crowd before and between rounds, the fight crowd during a round ---- */
  startAmb(k){const c=this.ctx,b=this.buf[k];if(this.amb[k]||!b)return;const s=c.createBufferSource();s.buffer=b;s.loop=true;s.loopStart=0.4;s.loopEnd=b.duration-0.6;
    const g=c.createGain();g.gain.value=0.0001;s.connect(g);g.connect(this.crowd);s.start(0,Math.random()*Math.max(0.1,b.duration-2));this.amb[k]=g;},
  update(dt,excite,danger,phase){if(!this.ctx)return;const now=this.ctx.currentTime;
    this.ambT-=dt;if(this.ambT<=0){this.ambT=0.15;const live=G.mode!=='attract',inRound=phase==='fight'||phase==='down';
      if(this.amb.roundAmb)this.amb.roundAmb.gain.setTargetAtTime(live&&inRound?0.5+excite*0.45:live?0.12:0.0001,now,0.6);
      if(this.amb.introAmb)this.amb.introAmb.gain.setTargetAtTime(live&&!inRound?0.75:0.0001,now,0.8);}
    const d=this.ok()?danger:0;if(Math.abs(d-this.danger)>0.01){this.danger=d;this.muffle.frequency.setTargetAtTime(d>0?20000-15000*d:20000,now,0.15);}}
};
/* Load and decode every sound as soon as the page opens, so the first bell and first punches are never silent.
   The audio stays paused until the first tap (browsers require that), and wake() starts it. */
Sfx.init();
['pointerup','touchend','keydown'].forEach(t=>window.addEventListener(t,()=>Sfx.wake(),{capture:true,passive:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)Sfx.wake();});
