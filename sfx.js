// Sound effects, synthesised live with the Web Audio API (no audio files to download).
// Browsers keep audio locked until the visitor interacts, so nothing plays before the first click, tap or key press.
// A small SFX toggle (bottom right) turns it on/off; the choice is remembered.
(() => {
  const KEY = 'sfx';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  let ctx = null, master = null, noiseBuf = null, analyser = null, unlocked = false;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function ensure(){
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = .9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
      analyser = ctx.createAnalyser(); analyser.fftSize = 512;
      master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const ok = () => on && unlocked && ensure() && ctx.state !== 'closed';

  // one oscillator with a quick envelope
  function tone(freq, dur, o = {}){
    const t = ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const a = o.gain == null ? .06 : o.gain;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + Math.min(.008, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc; osc.connect(g);
    if (o.lp){ const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.disconnect(); g.connect(f); f.connect(master); } else g.connect(master);
    osc.start(t); osc.stop(t + dur + .03);
  }
  // filtered noise burst / sweep
  function noise(dur, o = {}){
    const t = ctx.currentTime + (o.delay || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = o.type || 'bandpass'; f.Q.value = o.q == null ? 1.2 : o.q;
    f.frequency.setValueAtTime(o.f0 || 1000, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const a = o.gain == null ? .08 : o.gain, peak = t + dur * (o.peak == null ? .35 : o.peak);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, peak); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * .5); src.stop(t + dur + .05);
  }

  let lastHover = 0;
  const S = {
    hover(){ const n = performance.now(); if (n - lastHover < 70 || !ok()) return; lastHover = n; tone(rnd(1500, 1900), .03, { type: 'triangle', gain: .055 }); },
    click(){ if (!ok()) return; tone(880, .06, { type: 'square', gain: .035, lp: 3200 }); tone(1320, .08, { type: 'sine', gain: .05, delay: .04 }); },
    ping(){ if (!ok()) return; tone(1250, .32, { to: 420, gain: .05 }); noise(.12, { type: 'highpass', f0: 4000, gain: .015, peak: .1 }); },
    step(){ if (!ok()) return; tone(520, .14, { to: 900, gain: .05 }); tone(1040, .1, { gain: .04, delay: .07 }); },
    scramble(){ if (!ok()) return; for (let i = 0; i < 7; i++) tone(rnd(1400, 3200), .022, { type: 'square', gain: .012, delay: i * .045, lp: 4000 }); },
    glitch(len = .4){ if (!ok()) return; const n = Math.round(len * 16);
      for (let i = 0; i < n; i++){ const d = i * (len / n) + rnd(0, .02);
        noise(rnd(.02, .05), { type: 'highpass', f0: rnd(1500, 5000), gain: rnd(.02, .05), delay: d, peak: .2 });
        if (i % 2) tone(rnd(120, 900), .035, { type: 'square', gain: .02, delay: d, lp: 2000 }); } },
    reveal(){ if (!ok()) return; tone(180, .95, { type: 'sawtooth', to: 1900, gain: .028, lp: 2600 }); S.glitch(.8); },
    lock(){ if (!ok()) return; tone(110, .22, { to: 55, gain: .16 }); tone(660, .1, { gain: .045, delay: .02 }); tone(990, .14, { gain: .04, delay: .09 }); },
    leave(){ if (!ok()) return; noise(.75, { f0: 250, f1: 4200, q: 1.5, gain: .1, peak: .55 }); tone(90, .6, { to: 260, gain: .06, lp: 500 }); },
    arrive(){ if (!ok()) return; noise(.8, { f0: 4200, f1: 260, q: 1.5, gain: .09, peak: .3 }); tone(300, .35, { to: 70, gain: .05, lp: 600, delay: .1 }); tone(1320, .2, { gain: .035, delay: .5 }); },
    on(){ if (!ok()) return; tone(660, .09, { gain: .05 }); tone(990, .14, { gain: .05, delay: .08 }); },
    _peak(){ if (!analyser) return -1; const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a); let m = 0; for (const v of a) m = Math.max(m, Math.abs(v - 128)); return m; },
    get enabled(){ return on; },
    get running(){ return !!ctx && ctx.state === 'running'; },
  };
  window.SFX = S;

  /* ---------- unlock on the first interaction ---------- */
  const unlock = () => { unlocked = true; ensure(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, unlock, { once: false, capture: true, passive: true }));

  /* ---------- automatic sounds for any link or button ---------- */
  const hot = t => t && t.closest && t.closest('a[href],button,.service-item');
  document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' && hot(e.target) && !hot(e.relatedTarget)) S.hover(); });
  document.addEventListener('pointerdown', e => { const h = hot(e.target); if (h && !h.closest('.sfx-wrap')) S.click(); }, true);


  /* ---------- ambient bed: warm analog drone + tape air, with a soft techno pulse underneath ---------- */
  // Analog side : detuned saw drone through a slowly breathing low-pass, pitch drift, tape hiss, vinyl crackle.
  // Techno side : a quiet 4-on-the-floor kick (the drone ducks on every beat), off-beat hats and a sparse delayed arpeggio.
  // The whole bed gets a little brighter and busier as you scroll down the page.
  const BPM = 104, BEAT = 60 / BPM, STEP = BEAT / 4;
  const AMB_KEY = 'amb';
  let ambOn = true;
  try { ambOn = localStorage.getItem(AMB_KEY) !== 'off'; } catch (e) {}
  let A = null, schedTimer = null, nextStep = 0, stepIdx = 0, filmLoud = false;
  const scrollAmt = () => { const m = document.documentElement.scrollHeight - innerHeight; return m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; };
  const PENTA = [57, 60, 62, 64, 67, 69, 72];                          // A minor pentatonic (MIDI), A3 up
  const mtof = n => 440 * Math.pow(2, (n - 69) / 12);

  function ambBuild(){
    const bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(master);
    // drone: three saws (A1, E2, A2) a few cents apart -> warm low-pass that breathes
    const droneG = ctx.createGain(); droneG.gain.value = 1;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2; lp.frequency.value = 320;
    droneG.connect(lp); lp.connect(bus);
    const oscs = [];
    [[55, -7], [55.4, 6], [82.4, -4], [110, 5], [164.8, -9]].forEach(([f, c], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i < 4 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = c; g.gain.value = [.16, .16, .1, .06, .035][i];
      o.connect(g); g.connect(droneG); o.start(); oscs.push(o);
    });
    const sub = ctx.createOscillator(), subG = ctx.createGain(); sub.type = 'sine'; sub.frequency.value = 55; subG.gain.value = .22;
    sub.connect(subG); subG.connect(bus); sub.start();
    // slow analog movement: filter breathing + gentle pitch wobble
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .07; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    const wob = ctx.createOscillator(), wobG = ctx.createGain(); wob.frequency.value = .23; wobG.gain.value = 9; wob.connect(wobG); oscs.forEach(o => wobG.connect(o.detune)); wob.start();
    // tape air: band-limited noise
    const air = ctx.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
    const airF = ctx.createBiquadFilter(); airF.type = 'bandpass'; airF.frequency.value = 2600; airF.Q.value = .5;
    const airG = ctx.createGain(); airG.gain.value = .012; air.connect(airF); airF.connect(airG); airG.connect(bus); air.start();
    // delay for the arpeggio (dotted-eighth feel, dark repeats)
    const dl = ctx.createDelay(1); dl.delayTime.value = BEAT * .75; const fb = ctx.createGain(); fb.gain.value = .38;
    const dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2200;
    dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(bus);
    A = { bus, droneG, lp, airG, dl, level: 0, started: false };
  }

  function ambHit(fn){ if (A) fn(A); }
  function kick(t, a){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(125, t); o.frequency.exponentialRampToValueAtTime(42, t + .2);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + .004); g.gain.exponentialRampToValueAtTime(0.0001, t + .26);
    o.connect(g); g.connect(A.bus); o.start(t); o.stop(t + .3);
  }
  function hat(t, a, open){
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
    const d = open ? .09 : .028;
    g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(A.bus); src.start(t, Math.random()); src.stop(t + d + .02);
  }
  function pluck(t, midi, a){
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = mtof(midi); f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(500, t + .25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + .006); g.gain.exponentialRampToValueAtTime(0.0001, t + .3);
    o.connect(f); f.connect(g); g.connect(A.bus); g.connect(A.dl); o.start(t); o.stop(t + .35);
  }
  function crackle(t){                                                  // a tiny vinyl/tape pop
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = rnd(1500, 5000); f.Q.value = 1.5;
    g.gain.setValueAtTime(rnd(.01, .03), t); g.gain.exponentialRampToValueAtTime(0.0001, t + rnd(.004, .012));
    src.connect(f); f.connect(g); g.connect(A.bus); src.start(t, Math.random()); src.stop(t + .03);
  }

  let nextCrackle = 0;
  function schedule(){
    if (!A || !ctx || ctx.state !== 'running') return;
    const sc = scrollAmt(), now = ctx.currentTime;
    // bed gets brighter and the pulse louder with scroll
    A.lp.frequency.setTargetAtTime(300 + sc * 700, now, .6);
    while (nextStep < now + .12){
      const t = Math.max(nextStep, now), s16 = stepIdx % 16, drive = .25 + sc * .75;
      if (s16 % 4 === 0){                                              // kick on the beat + sidechain-style duck on the drone
        kick(t, .13 * drive);
        A.droneG.gain.cancelScheduledValues(t); A.droneG.gain.setValueAtTime(.55, t); A.droneG.gain.linearRampToValueAtTime(1, t + BEAT * .85);
      }
      if (s16 % 4 === 2) hat(t, .02 * drive, false);                   // off-beat hat
      if (s16 === 14) hat(t, .016 * drive, true);                      // open hat at the end of the bar
      if (s16 % 2 === 1 && Math.random() < .09 + sc * .22){             // sparse arpeggio
        const bar = Math.floor(stepIdx / 16) % 4, base = [0, 0, 2, 3][bar];
        pluck(t, PENTA[(base + ((Math.random() * 5) | 0)) % PENTA.length] + (Math.random() < .25 ? 12 : 0), .03);
      }
      nextStep += STEP; stepIdx++;
    }
    if (now > nextCrackle){ crackle(now + rnd(0, .05)); nextCrackle = now + rnd(.25, 1.8); }
  }

  function ambTarget(){ return (ambOn && !filmLoud && !document.hidden) ? .12 : 0; }
  function ambApply(sec){
    if (!A) return;
    const now = ctx.currentTime; A.bus.gain.cancelScheduledValues(now);
    A.bus.gain.setValueAtTime(Math.max(.0001, A.bus.gain.value), now);
    A.bus.gain.linearRampToValueAtTime(Math.max(.0001, ambTarget()), now + sec);
  }
  function ambStart(){
    if (!unlocked || !ensure()) return;
    if (!A){ ambBuild(); nextStep = ctx.currentTime + .1; schedTimer = setInterval(schedule, 25); }
    ambApply(3.5);
  }
  S.amb = {
    get on(){ return ambOn; },
    set(v){ ambOn = !!v; try { localStorage.setItem(AMB_KEY, ambOn ? 'on' : 'off'); } catch (e) {} if (ambOn) ambStart(); else ambApply(1.2); },
    film(loud){ filmLoud = !!loud; ambApply(.8); },              // the project film has its own sound: tuck the bed away
    fadeOut(sec = .6){ if (!A) return; const now = ctx.currentTime; A.bus.gain.cancelScheduledValues(now); A.bus.gain.setValueAtTime(Math.max(.0001, A.bus.gain.value), now); A.bus.gain.linearRampToValueAtTime(.0001, now + sec); },
    _rms(){ if (!analyser) return -1; const a = new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(a); let q = 0; for (const v of a) q += ((v - 128) / 128) ** 2; return Math.sqrt(q / a.length); },
  };
  // arriving through a page transition: the visitor already interacted, so try to carry on straight away
  try { if (sessionStorage.getItem('pt')){ unlocked = true; if (ambOn) ambStart(); } } catch (e) {}
  // start with the first interaction, and keep it polite when the tab is hidden
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, () => { if (ambOn) ambStart(); }, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else { ctx.resume(); ambApply(1.5); } });

  /* ---------- toggle buttons: SFX and HUM (ambient) ---------- */
  const style = document.createElement('style');
  style.textContent = `.sfx-wrap{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:76px;z-index:9400;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
    .sfx-toggle{display:flex;align-items:center;gap:8px;padding:9px 11px;font:500 .62rem/1 'JetBrains Mono',ui-monospace,Consolas,monospace;letter-spacing:.12em;
    background:rgba(255,255,255,.72);border:1px solid currentColor;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:pointer;color:#0b0b0c;transition:background .2s,color .2s}
    .sfx-toggle:hover{background:#0b0b0c;color:#fff}
    .sfx-toggle i{display:flex;align-items:flex-end;gap:2px;height:11px}
    .sfx-toggle i b{display:block;width:2px;background:currentColor;height:100%;transform-origin:bottom;animation:sfxbar .9s ease-in-out infinite}
    .sfx-toggle i b:nth-child(2){animation-delay:.15s}.sfx-toggle i b:nth-child(3){animation-delay:.3s}.sfx-toggle i b:nth-child(4){animation-delay:.45s}
    .sfx-toggle.off i b{animation:none;transform:scaleY(.2)}
    .sfx-toggle.hum i b{animation-duration:2.2s}
    @keyframes sfxbar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
    @media (prefers-reduced-motion:reduce){.sfx-toggle i b{animation:none}}
    @media (max-width:760px){.sfx-wrap{bottom:68px}.sfx-toggle{padding:10px 11px}}`;
  document.head.append(style);
  const wrap = document.createElement('div'); wrap.className = 'sfx-wrap';
  const mk = (cls, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sfx-toggle ' + cls; b.setAttribute('aria-label', label); return b; };
  const bHum = mk('hum', 'Toggle ambient sound'), bSfx = mk('', 'Toggle sound effects');
  const paint = (b, name, state) => { b.classList.toggle('off', !state); b.innerHTML = `<i><b></b><b></b><b></b><b></b></i>${name} ${state ? 'ON' : 'OFF'}`; b.setAttribute('aria-pressed', String(state)); };
  const repaint = () => { paint(bHum, 'HUM', ambOn); paint(bSfx, 'SFX', on); };
  bSfx.addEventListener('click', () => { on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} repaint(); unlocked = true; if (on){ ensure(); S.on(); } });
  bHum.addEventListener('click', () => { unlocked = true; ensure(); S.amb.set(!ambOn); repaint(); });
  repaint(); wrap.append(bHum, bSfx);
  const mount = () => document.body.append(wrap);
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
