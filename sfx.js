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
  document.addEventListener('pointerdown', e => { const h = hot(e.target); if (h && !h.closest('.sfx-toggle')) S.click(); }, true);

  /* ---------- toggle button ---------- */
  const style = document.createElement('style');
  style.textContent = `.sfx-toggle{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:76px;z-index:9400;display:flex;align-items:center;gap:8px;padding:9px 11px;
    font:500 .62rem/1 'JetBrains Mono',ui-monospace,Consolas,monospace;letter-spacing:.12em;color:inherit;background:rgba(255,255,255,.72);border:1px solid currentColor;
    -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);cursor:pointer;color:#0b0b0c;transition:background .2s,color .2s}
    .sfx-toggle:hover{background:#0b0b0c;color:#fff}
    .sfx-toggle i{display:flex;align-items:flex-end;gap:2px;height:11px}
    .sfx-toggle i b{display:block;width:2px;background:currentColor;height:100%;transform-origin:bottom;animation:sfxbar .9s ease-in-out infinite}
    .sfx-toggle i b:nth-child(2){animation-delay:.15s}.sfx-toggle i b:nth-child(3){animation-delay:.3s}.sfx-toggle i b:nth-child(4){animation-delay:.45s}
    .sfx-toggle.off i b{animation:none;transform:scaleY(.2)}
    @keyframes sfxbar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
    @media (prefers-reduced-motion:reduce){.sfx-toggle i b{animation:none}}
    @media (max-width:760px){.sfx-toggle{bottom:68px;padding:10px 11px}}`;
  document.head.append(style);
  const btn = document.createElement('button');
  btn.className = 'sfx-toggle'; btn.type = 'button'; btn.setAttribute('aria-label', 'Toggle sound effects');
  const paint = () => { btn.classList.toggle('off', !on); btn.innerHTML = `<i><b></b><b></b><b></b><b></b></i>SFX ${on ? 'ON' : 'OFF'}`; btn.setAttribute('aria-pressed', String(on)); };
  btn.addEventListener('click', () => { on = !on; try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {} paint(); unlocked = true; if (on){ ensure(); S.on(); } });
  paint();
  document.addEventListener('DOMContentLoaded', () => document.body.append(btn));
  if (document.body) document.body.append(btn);
})();
