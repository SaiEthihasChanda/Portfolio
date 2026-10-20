// One pinned scene. Scroll progress p (0..1) drives everything: the name, the portrait scan,
// the description and the work links all appear as part of the animation.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));                 // 0→1 between a and b
const ease = t => 1 - Math.pow(1 - t, 3);                          // easeOutCubic
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const track = $('#track'), stage = $('#stage');
const el = {
  gridFine: $('#grid-fine'), gridMajor: $('#grid-major'), bgtext: $('#bgtext'), crosses: $('#crosses'),
  pw: $('#pw'), disc: $('#disc'), rings: $('#rings'), ringA: $('#ring-a'), ringB: $('#ring-b'), ringC: $('#ring-c'),
  pimg: $('#pimg'), pcv: $('#pcv'), img: $('#portrait'), scan: $('#scanline'), rts: $$('.rt'), await: $('#await'),
  nameWrap: $('#name-wrap'), hi: $('#hi'), boot: $('#boot'),
  about: $('#about'), lead: $('#lead'), work: $('#work'), rows: $$('#links li'), contact: $('#contact'),
  steps: $$('#steps button'), marker: $('#marker'), pct: $('#pct'), bar: $('#bar'), hint: $('#hint'), ruler: $('#ruler'),
  clock: $('#clock'), cx: $('#cx'), cy: $('#cy'), tt: $('#tt'),
};

let H = innerHeight, W = innerWidth, rulerH = 0;
let target = 0, cur = 0, mx = 0, my = 0, smx = 0, smy = 0, lenis = null;
const t0 = performance.now();

/* ---------- build: lead words, floating crosses ---------- */
const words = [];
(function splitWords(){
  const text = el.lead.textContent.trim().split(/\s+/);
  el.lead.textContent = '';
  text.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w'; s.textContent = w;
    el.lead.append(s, i < text.length - 1 ? ' ' : '');
    words.push(s);
  });
})();

const crosses = [];
(function makeCrosses(){
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++){
    const c = document.createElement('i');
    const x = rnd() * 100, depth = .2 + rnd() * 1.1;
    c.style.left = x + '%';
    c.style.opacity = (.25 + depth * .45).toFixed(2);
    el.crosses.append(c);
    crosses.push({ c, y0: rnd(), depth });
  }
})();

/* ---------- portrait proportions follow the cutout ---------- */
(function fitPortrait(){
  const img = $('#portrait');
  const set = () => img.naturalWidth && el.pw.style.setProperty('--ar', (img.naturalWidth / img.naturalHeight).toFixed(4));
  img.complete ? set() : img.addEventListener('load', set);
})();

/* ---------- portrait reveal: glitch slices with RGB split (canvas) ---------- */
const reveal = (() => {
  const cv = el.pcv, ctx = cv.getContext('2d'), img = el.img;
  const S = 64;                                           // number of horizontal slices
  let tint = null, ready = false, nw = 0, nh = 0;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const slices = Array.from({ length: S }, (_, i) => ({ t: (i / S) * .62 + rnd() * .38, dir: rnd() < .5 ? -1 : 1, amp: .35 + rnd() * .65 }));
  const tinted = col => {
    const c = document.createElement('canvas'); c.width = nw; c.height = nh;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, nw, nh);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, nw, nh); return c;
  };
  function setup(){
    if (!img.naturalWidth) return;
    const k = img.naturalWidth > 1000 ? .5 : 1;           // draw at half size: plenty for the screen, much cheaper
    nw = Math.round(img.naturalWidth * k); nh = Math.round(img.naturalHeight * k);
    cv.width = nw; cv.height = nh;
    tint = { red: tinted('#dc143c'), cyan: tinted('#19d3ff') }; ready = true;
  }
  img.complete ? setup() : img.addEventListener('load', setup);
  return function draw(r, time){                           // r: 0..1 reveal progress
    if (!ready) return false;
    if (r >= .999 || r <= 0){ cv.style.display = 'none'; img.style.opacity = r <= 0 ? 0 : 1; return r > 0; }
    cv.style.display = 'block'; img.style.opacity = 0;
    ctx.clearRect(0, 0, nw, nh);
    const sh = nh / S;
    for (let i = 0; i < S; i++){
      const sl = slices[i], lp = clamp((r * 1.45 - sl.t) / .38);     // each slice has its own start time
      if (lp <= 0) continue;
      const y = Math.floor(i * sh), h = Math.ceil(sh) + 1;
      const glitch = (1 - lp) * (1 - lp);
      const dx = sl.dir * sl.amp * glitch * nw * .22 + (glitch > .02 ? Math.sin(time * 40 + i) * 4 : 0);
      ctx.globalAlpha = Math.min(1, lp * 1.6);
      ctx.drawImage(img, 0, y, nw, h, dx, y, nw, h);                  // the slice itself
      if (glitch > .01){                                              // chromatic split while it settles
        ctx.globalAlpha = Math.min(.6, glitch * 1.1);
        ctx.drawImage(tint.red, 0, y, nw, h, dx + glitch * nw * .05, y, nw, h);
        ctx.drawImage(tint.cyan, 0, y, nw, h, dx - glitch * nw * .05, y, nw, h);
      }
    }
    ctx.globalAlpha = 1;
    return true;
  };
})();

/* ---------- layout measurements ---------- */
function measure(){
  H = innerHeight; W = innerWidth;
  rulerH = Math.max(0, el.ruler.clientHeight - 2);
  el.pw.style.transformOrigin = (W <= 820 && H > 520) ? '100% 0' : '';          // phones: the portrait shrinks toward its top-right corner
}
addEventListener('resize', measure); measure();

/* ---------- scroll ---------- */
function readScroll(){
  const max = track.offsetHeight - H;
  target = max > 0 ? clamp(scrollY / max) : 0;
}
function goTo(p, dur = 1.8){
  const y = p * (track.offsetHeight - H);
  if (lenis) lenis.scrollTo(y, { duration: dur });
  else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
}
if (typeof Lenis !== 'undefined' && !reduce){
  lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  lenis.on('scroll', readScroll);
  (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
} else addEventListener('scroll', readScroll, { passive: true });
readScroll();

el.steps.forEach(b => b.addEventListener('click', () => goTo(parseFloat(b.dataset.p))));
addEventListener('pointermove', e => { mx = e.clientX / W - .5; my = e.clientY / H - .5; });

/* ---------- the timeline ---------- */
function render(p, time){
  smx += (mx - smx) * .06; smy += (my - smy) * .06;

  // --- background parallax (each layer a different speed) ---
  el.gridFine.style.backgroundPosition = `${(-p * 90).toFixed(1)}px ${(-p * 220).toFixed(1)}px`;
  el.gridMajor.style.backgroundPosition = `${(-p * 260).toFixed(1)}px ${(-p * 700).toFixed(1)}px`;
  el.bgtext.style.transform = `translate3d(${(4 - p * 52).toFixed(2)}vw,${(smy * -16).toFixed(1)}px,0)`;
  crosses.forEach(({ c, y0, depth }) => {
    const y = (((y0 * H - p * depth * 1100 + smy * depth * 30) % H) + H) % H;
    c.style.transform = `translate3d(${(smx * -30 * depth).toFixed(1)}px,${y.toFixed(1)}px,0)`;
  });

  // --- 1. Hi, I'm Ethihas ---
  const s1 = easeIO(seg(p, .12, .27));
  const k = 1 - .69 * s1;
  el.nameWrap.style.transform = `translate3d(0,calc(-50% - ${(s1 * (H < 520 ? 31 : 37)).toFixed(2)}vh),0) scale(${k.toFixed(4)})`;
  const hiO = 1 - seg(p, .05, .13);
  el.hi.style.opacity = hiO.toFixed(3);
  el.boot.style.opacity = (1 - seg(p, .03, .09)).toFixed(3);
  el.hint.style.opacity = (1 - seg(p, .02, .08)).toFixed(3);

  // --- 2. portrait scan-in ---
  const s2 = ease(seg(p, .17, .34));
  const drift = p * -3;                                                // vh, slow rise while scrolling
  const mob = W <= 820 && H > 520, pScale = mob ? 1 - .42 * easeIO(seg(p, .31, .38)) : 1;   // phones: make room for the text
  el.pw.style.transform = `translate3d(${(smx * -14 + (1 - s2) * 70).toFixed(1)}px,${(drift * H / 100 + smy * -8).toFixed(1)}px,0) scale(${pScale.toFixed(4)})`;
  reveal(s2, time);
  el.pimg.style.transform = `translate3d(${(smx * -10).toFixed(1)}px,0,0) scale(${((1 + p * .05) * (1 + (1 - s2) * .1)).toFixed(4)})`;
  el.scan.style.opacity = 0;
  el.disc.style.opacity = ease(seg(p, .2, .36)).toFixed(3);
  el.disc.style.clipPath = `circle(${(ease(seg(p, .17, .31)) * 72).toFixed(2)}% at 50% 50%)`;   // iris opens from the centre
  el.disc.style.transform = `translate3d(${(smx * 22).toFixed(1)}px,${(smy * 14 + (1 - s2) * 40).toFixed(1)}px,0) scale(${(.55 + .45 * s2 + p * .06).toFixed(4)})`;
  el.rings.style.transform = `translate3d(${(smx * -8).toFixed(1)}px,${(smy * -6).toFixed(1)}px,0) scale(${(.92 + .08 * s2 + p * .04).toFixed(4)})`;
  el.rings.style.opacity = (.55 + .45 * s2).toFixed(2);
  el.ringA.style.transform = `rotate(${(p * 200 + time * 4 + (1 - s2) * 160).toFixed(2)}deg)`;
  el.ringB.style.transform = `rotate(${(-(p * 320) - time * 7 - (1 - s2) * 240).toFixed(2)}deg)`;
  el.ringC.style.transform = `rotate(${(p * 460 + time * 11).toFixed(2)}deg)`;
  const rt = seg(p, .13, .22);
  el.rts.forEach(r => { r.style.opacity = rt.toFixed(2); r.style.transform = `scale(${(1.5 - .5 * rt).toFixed(3)})`; });
  el.await.style.opacity = (1 - seg(p, .12, .19)).toFixed(2);

  // --- 3. description, revealed word by word ---
  const aIn = ease(seg(p, .30, .37)), aOut = easeIO(seg(p, .52, .58));
  el.about.style.opacity = (aIn * (1 - aOut)).toFixed(3);
  el.about.style.transform = `translate3d(0,${((1 - aIn) * 60 - aOut * 80).toFixed(1)}px,0)`;
  const wp = seg(p, .33, .49) * (words.length + 4);
  words.forEach((w, i) => { w.style.opacity = (.14 + .86 * clamp(wp - i)).toFixed(3); });

  // --- 4. links to work ---
  const wIn = seg(p, .57, .62);
  el.work.style.opacity = wIn.toFixed(3);
  el.work.style.transform = `translate3d(0,${((1 - ease(wIn)) * 50).toFixed(1)}px,0)`;
  el.rows.forEach((li, i) => {
    const r = ease(seg(p, .59 + i * .035, .65 + i * .035));
    li.style.opacity = r.toFixed(3);
    li.style.transform = `translate3d(${((1 - r) * -40).toFixed(1)}px,0,0)`;
  });
  const c = ease(seg(p, .80, .87));
  el.contact.style.opacity = c.toFixed(3);
  el.contact.style.transform = `translate3d(0,${((1 - c) * 24).toFixed(1)}px,0)`;
  el.work.style.pointerEvents = wIn > .5 ? 'auto' : 'none';

  // --- HUD readouts ---
  const idx = p < .22 ? 0 : p < .56 ? 1 : 2;
  el.steps.forEach((b, i) => b.classList.toggle('on', i === idx));
  el.marker.style.transform = `translate3d(0,${(p * rulerH).toFixed(1)}px,0)`;
  el.pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
  el.bar.style.transform = `scaleX(${p.toFixed(4)})`;
  el.cx.textContent = (smx * 2).toFixed(3).padStart(6, ' ');
  el.cy.textContent = (smy * 2).toFixed(3).padStart(6, ' ');
}

function loop(now){
  const time = (now - t0) / 1000;
  cur = reduce ? target : cur + (target - cur) * .12;
  if (Math.abs(target - cur) < .0002) cur = target;
  render(cur, time);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setInterval(() => {
  el.clock.textContent = new Date().toLocaleTimeString('en-GB');
  el.tt.textContent = String(Math.floor((performance.now() - t0) / 1000)).padStart(2, '0');
}, 500);


/* ---------- loading screen: animates the name while the page really loads ---------- */
(function loader(){
  const root = document.documentElement, L = $('#loader');
  if (!L) { document.body.classList.add('ready'); root.classList.remove('loading'); return; }
  const fill = $('#ld-fill'), edge = $('#ld-edge'), bar = $('#ld-bar'), pct = $('#ld-pct'), msg = $('#ld-msg');
  // coming back from a project page: shorter intro, and jump straight to the work list
  let back = false;
  try { back = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
  if (location.hash === '#work'){
    window.scrollTo(0, Math.round(.97 * (track.offsetHeight - H)));
    readScroll(); cur = target;
  }
  const MIN_MS = reduce ? 0 : (back ? 700 : 2200), MAX_MS = 7000;
  const start = performance.now();
  if (lenis) lenis.stop();

  // real work: fonts, portrait, page load
  let done = 0; const total = 3;
  const tick = () => { done++; };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(tick, tick);
  const img = $('#portrait');
  img.complete ? tick() : (img.addEventListener('load', tick), img.addEventListener('error', tick));
  document.readyState === 'complete' ? tick() : addEventListener('load', tick);

  const msgs = [[0, 'INITIALISING'], [30, 'LOADING TYPE'], [55, 'LOADING PORTRAIT'], [80, 'CALIBRATING HUD'], [100, 'READY']];
  let shown = 0, finished = false;
  (function frame(now){
    const t = now - start;
    const real = done / total;
    const timed = clamp(t / MIN_MS);
    // never ahead of the time ramp, never ahead of what has really loaded (+ a little)
    let goal = Math.min(timed, real >= 1 ? 1 : .12 + real * .8);
    if (t > MAX_MS) goal = 1;
    shown += (goal - shown) * .12;
    if (goal - shown < .002) shown = goal;
    const v = shown * 100;
    const eb = 16 + v * .69;                       // glyphs occupy ~16%–85% of the text box, bottom-up
    fill.style.clipPath = `inset(${(100 - eb).toFixed(2)}% 0 0 0)`;
    edge.style.bottom = `${eb.toFixed(2)}%`;
    edge.style.opacity = v > 0 && v < 99.5 ? 1 : 0;
    bar.style.transform = `scaleX(${shown.toFixed(4)})`;
    pct.textContent = String(Math.round(v)).padStart(3, '0');
    msg.textContent = msgs.filter(m => v >= m[0]).pop()[1];
    L.setAttribute('aria-valuenow', Math.round(v));
    if (shown >= 1 && !finished){ finished = true; finish(); return; }
    requestAnimationFrame(frame);
  })(performance.now());

  function finish(){
    fill.classList.add('done');
    setTimeout(() => {
      L.classList.add('out');
      setTimeout(() => document.body.classList.add('ready'), 380);     // hero text rises as the screen lifts
      setTimeout(() => { L.remove(); root.classList.remove('loading'); if (lenis) lenis.start(); }, reduce ? 0 : 1100);
    }, reduce ? 0 : 450);
  }
})();

/* while testing locally, Download buttons use the local file (the public one lives on GitHub Releases) */
if (/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname)) $$('a[data-local]').forEach(a => a.setAttribute('href', a.dataset.local));
