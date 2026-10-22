/* South Paw · src/audio/sound.js
   Sound engine: plays the recorded sounds listed in data/sounds.js.
   See PROJECT_GUIDE.md for how this file fits with the rest. */
'use strict';
/* ================= SOUND: only the recorded sounds supplied for the game =================
   punch (jabs, crosses), face (hooks, uppercuts, counters), body (body shots), bell (round start), bellEnd (time, knockouts),
   cheer, react2 (big moments), livko (knockdowns, liver shots, knockouts), introAmb (before and between rounds), roundAmb (during a round). */
const Sfx={buf:{},ctx:null,on:true,master:null,muffle:null,fx:null,crowd:null,amb:{},danger:0,rl:{},ambT:0,
  ok(){return !!this.ctx&&G.mode!=='attract';},
  init(){
    if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=new AC();this.ctx=c;
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
    else{g.gain.value=vol;s.start(t,off||0);}return s;},
  pan(p){const c=this.ctx;if(p&&c.createStereoPanner){const n=c.createStereoPanner();n.pan.value=clamp(p,-0.6,0.6);n.connect(this.fx);return n;}return this.fx;},
  duck(){const c=this.ctx,t=c.currentTime,g=this.crowd.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0.4,t+0.012);g.setTargetAtTime(1,t+0.14,0.2);},
  /* ---- punches: every landed or blocked punch makes a sound, and the crowd dips under it ---- */
  punch(e,pan){if(!this.ok())return;if(this.ctx.state==='suspended')this.ctx.resume();const p=e.p||0.3,dest=this.pan(pan);this.duck();
    if(e.blk){const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=e.parry?2600:1500;f.connect(dest);
      this.play('punch',e.parry?0.75:0.65,e.parry?1.25:0.82,f);return;}
    const body=e.target==='body',k=e.kind||'straight',combo=Math.min(e.combo||1,6),big=k==='hook'||k==='upper'||e.label==='Counter'||p>0.75;
    const r=rand(0.95,1.05)*(1+0.03*(combo-1));
    if(body)this.play('body',0.95+p*0.25,r,dest);
    else if(big)this.play('face',1.5+p*0.35,r,dest);
    else this.play('punch',0.85+p*0.3,r,dest);
    if(e.label==='Counter'){const c=this.ctx,d=c.createDelay();d.delayTime.value=0.06;const g=c.createGain();g.gain.value=0.25;d.connect(g);g.connect(dest);this.play(big?'face':'punch',0.8,r,d);}},
  swish(){},whiff(){},step(){},block(){},count(){},
  bell(n){if(!this.ok())return;if(n===1){this.play('bell',0.9);return;}this.play('bellEnd',n===3?1:0.9);if(n===3)this.play('bellEnd',0.8,1,null,this.ctx.currentTime+0.9);},
  knockdown(){if(!this.ok())return;this.react('ko',1);},
  boom(){if(!this.ok())return;this.react('ko',1.2);this.react('cheer',1,5,1.4);},
  /* ---- the crowd: segments of the recorded reactions ---- */
  react(type,s,dur,delay){if(!this.ok())return;const c=this.ctx,t=c.currentTime+(delay||0);s=clamp(s||0.6,0.1,1.4);
    const gap={ooh:0.7,gasp:0.9,cheer:1.4,roar:1.6,ko:2.5}[type];if(gap===undefined)return;
    const lt=this.rl[type]||-9;if(t-lt<gap&&s<1)return;this.rl[type]=t;
    if(type==='ko'){this.play('livko',1.0*s,1,this.crowd,t,0.2,Math.min(10.4,dur||8));return;}
    if(type==='ooh'||type==='gasp'){const B=this.buf.react2;if(!B)return;this.play('react2',0.9*s,rand(0.97,1.03),this.crowd,t,Math.random()*0.6,dur||2.2);return;}
    if(type==='roar'){const B=this.buf.livko;if(!B)return;this.play('livko',0.85*s,1,this.crowd,t,2.2+Math.random()*2,dur||3);return;}
    const B=this.buf.cheer;if(!B)return;const d=dur||1.8;this.play('cheer',0.85*s,rand(0.98,1.02),this.crowd,t,Math.random()*Math.max(0.1,B.duration-d-1),d);},
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
