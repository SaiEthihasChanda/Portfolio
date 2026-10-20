// Shared behaviour for the project pages: smooth scroll, banner (autoplaying video + controls), parallax,
// reveal-on-scroll, the Lekalu horizontal gallery and the ShapeShifter wheel.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis = null;
if (typeof Lenis !== 'undefined' && !reduce){
  lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
  (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(0);
}

/* ---------- title: animated letters, words kept whole ---------- */
const title = $('h1.title');
if (title){
  const txt = title.textContent; title.textContent = ''; title.setAttribute('aria-label', txt);
  let n = 0;
  txt.split(' ').forEach((word, wi, all) => {
    const w = document.createElement('span'); w.className = 'word'; w.setAttribute('aria-hidden', 'true');
    [...word].forEach(ch => {
      const s = document.createElement('span'); s.textContent = ch; s.style.animationDelay = (.15 + n++ * .055) + 's'; w.append(s);
    });
    title.append(w);
    if (wi < all.length - 1) title.append(' ');
  });
}

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('[data-reveal]').forEach(el => io.observe(el));

/* ---------- clock ---------- */
const clock = $('#clock');
const tickClock = () => clock && (clock.textContent = new Date().toLocaleTimeString('en-GB'));
tickClock(); setInterval(tickClock, 1000);

/* ---------- banner video: autoplays (muted, as browsers require), with HUD controls ---------- */
const bv = $('.banner video');
if (bv){
  const pBtn = $('#bn-play'), sBtn = $('#bn-snd'), fBtn = $('#bn-full'), seek = $('.seek'), fill = $('.seek b'), tm = $('#bn-time');
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let userPaused = false;
  const label = () => {
    pBtn.innerHTML = `<i class="led"></i>${bv.paused ? 'PLAY' : 'PAUSE'}`;
    sBtn.innerHTML = `<i class="led"></i>${bv.muted ? (userMuted ? 'SOUND OFF' : 'SOUND OFF · CLICK ANYWHERE FOR SOUND') : 'SOUND ON'}`;
    sBtn.classList.toggle('hint', bv.muted && !userMuted);
  };
  // Sound is ON by default. Browsers only allow that in some cases (e.g. you already interacted with the site), so if
  // the browser refuses we fall back to muted autoplay and switch the sound on at your first click, tap or key press.
  let userMuted = false;
  const armUnmute = () => {
    const evs = ['pointerdown', 'keydown', 'touchend'];
    const off = () => evs.forEach(ev => removeEventListener(ev, onFirst, true));
    function onFirst(e){
      off();
      if (e.target && e.target.closest && e.target.closest('#bn-snd')) return;   // the sound button handles itself
      if (bv.muted && !userMuted){ bv.muted = false; bv.volume = 1; if (bv.paused && !userPaused) bv.play().catch(() => {}); label(); }
    }
    evs.forEach(ev => addEventListener(ev, onFirst, true));
  };
  bv.muted = false; bv.volume = 1;
  if (reduce) { bv.pause(); }
  else bv.play().then(label).catch(() => {                         // refused: muted autoplay + unmute on first gesture
    bv.muted = true; bv.play().catch(() => {}); label(); armUnmute();
  });
  pBtn.addEventListener('click', () => { if (bv.paused){ userPaused = false; bv.play(); } else { userPaused = true; bv.pause(); } });
  sBtn.addEventListener('click', () => { bv.muted = !bv.muted; userMuted = bv.muted; if (!bv.muted){ bv.volume = 1; if (bv.paused && !userPaused) bv.play(); } label(); });
  fBtn.addEventListener('click', () => (bv.requestFullscreen || bv.webkitRequestFullscreen || (() => {})).call(bv));
  seek.addEventListener('click', e => { const r = seek.getBoundingClientRect(); if (bv.duration) bv.currentTime = clamp((e.clientX - r.left) / r.width) * bv.duration; });
  bv.addEventListener('play', label); bv.addEventListener('pause', label); bv.addEventListener('volumechange', label);
  bv.addEventListener('timeupdate', () => {
    if (!bv.duration) return;
    fill.style.width = (bv.currentTime / bv.duration * 100).toFixed(2) + '%';
    tm.textContent = `${fmt(bv.currentTime)} / ${fmt(bv.duration)}`;
  });
  // save the CPU while the banner is scrolled out of view
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting){ if (!userPaused && !reduce) bv.play().catch(() => {}); } else bv.pause();
  }, { threshold: .05 }).observe($('.banner'));
  label();
}

/* ---------- wheel (ShapeShifter): built twice, a dark one for the banner and a light one for the section ---------- */
const NS = 'http://www.w3.org/2000/svg';
const CAT = { image: '#2bb5a5', video: '#f08a3c', audio: '#9b6bff', document: '#4a8fff', data: '#46c06b', archive: '#d4a72c' };
const FMT = { PNG: 'image', WEBP: 'image', GIF: 'image', BMP: 'image', TIFF: 'image', ICO: 'image', AVIF: 'image', HEIC: 'image', SVG: 'image', JPG: 'image',
  PDF: 'document', DOCX: 'document', TXT: 'document', MD: 'document', HTML: 'document', EPUB: 'document',
  MP4: 'video', MKV: 'video', MP3: 'audio', WAV: 'audio', OGG: 'audio', CSV: 'data', JSON: 'data', YAML: 'data', ZIP: 'archive', '7Z': 'archive' };
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function createWheel(svg, dark){
  const inner = ['PNG', 'WEBP', 'PDF', 'GIF', 'BMP', 'TIFF', 'ICO', 'AVIF', 'HEIC', 'SVG'];
  const outer = ['JPG', 'MP4', 'MP3', 'WAV', 'DOCX', 'TXT', 'MD', 'HTML', 'CSV', 'JSON', 'YAML', 'ZIP', '7Z', 'EPUB', 'OGG', 'MKV'];
  const rings = [{ labels: inner, r0: 92, r1: 168, dir: 1 }, { labels: outer, r0: 176, r1: 262, dir: -1 }];
  const pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  const make = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.append(e); return e; };
  svg.setAttribute('viewBox', '-290 -290 580 580'); svg.classList.add('wheel-svg'); if (dark) svg.classList.add('dark');
  const out = [];
  rings.forEach(R => {
    const g = make('g', {}, svg), n = R.labels.length, gap = .012;
    const items = R.labels.map((lab, i) => {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap;
      const [x0, y0] = pt(R.r1, a0), [x1, y1] = pt(R.r1, a1), [x2, y2] = pt(R.r0, a1), [x3, y3] = pt(R.r0, a0);
      const col = CAT[FMT[lab]] || '#8a8f9c', [r, gg, b] = hexRgb(col);
      const seg = make('path', { class: 'seg', d: `M${x0} ${y0}A${R.r1} ${R.r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R.r0} ${R.r0} 0 0 0 ${x3} ${y3}Z` }, g);
      const idle = `rgba(${r},${gg},${b},${dark ? .22 : .16})`;
      seg.style.fill = idle;
      const am = (a0 + a1) / 2, [tx, ty] = pt((R.r0 + R.r1) / 2, am);
      const t = make('text', { x: tx, y: ty }, g); t.textContent = lab;
      return { seg, t, tx, ty, col, idle };
    });
    out.push({ g, items, dir: R.dir });
  });
  make('circle', { cx: 0, cy: 0, r: 70, fill: dark ? '#0d0e12' : '#18191e' }, svg);
  const ct = make('text', { x: 0, y: -6, style: 'fill:#fff;font-size:11px' }, svg); ct.textContent = 'CONVERT TO…';
  const cs = make('text', { x: 0, y: 12, style: 'font-size:10px;fill:' + (getComputedStyle(document.body).getPropertyValue('--accent-lt').trim() || '#8f9bff') }, svg); cs.textContent = 'CTRL + ALT + C';
  return {
    inner,
    set(angle, ri, active){                                 // rotate a ring and keep labels upright
      const R = out[ri]; R.g.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
      R.items.forEach(it => it.t.setAttribute('transform', `rotate(${(-angle).toFixed(2)} ${it.tx} ${it.ty})`));
    },
    pick(k){ out[0].items.forEach((it, i) => { const on = i === k; it.seg.classList.toggle('on', on); it.seg.style.fill = on ? it.col : it.idle; }); },
  };
}
const bannerWheel = $('#bn-wheel') && createWheel($('#bn-wheel'), true);
const sectionWheel = $('#wheel') && createWheel($('#wheel'), false);

/* ---------- per-frame scroll effects ---------- */
const bgG1 = $('.bg .g1'), bgG2 = $('.bg .g2'), pbar = $('.pbar i'), marker = $('.ruler b'), rulerEl = $('.ruler');
const banner = $('.banner'), bnMedia = $('.bn-media'), bnContent = $('.bn-content');
const gal = $('.gal'), strip = $('.strip'), galBar = $('.gal-bar i');
const wsec = $('.wheel-sec'), toEl = $('#to');
let lastTo = '', lastDark = null, lastDarkB = null;

function frame(now){
  const y = scrollY, H = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - H);
  const p = clamp(y / max), t = now / 1000;

  bgG1.style.backgroundPosition = `${(-y * .04).toFixed(1)}px ${(-y * .12).toFixed(1)}px`;
  bgG2.style.backgroundPosition = `${(-y * .1).toFixed(1)}px ${(-y * .35).toFixed(1)}px`;
  pbar.style.transform = `scaleX(${p.toFixed(4)})`;
  if (rulerEl) marker.style.transform = `translateY(${(p * (rulerEl.clientHeight - 2)).toFixed(1)}px)`;

  // banner parallax + switch the HUD to dark-on-light once the banner has gone
  const bh = banner.offsetHeight, bp = clamp(y / bh);
  bnMedia.style.transform = `translate3d(0,${(y * .28).toFixed(1)}px,0) scale(${(1 + bp * .08).toFixed(4)})`;
  bnContent.style.transform = `translate3d(0,${(y * .12).toFixed(1)}px,0)`;
  bnContent.style.opacity = (1 - bp * 1.15).toFixed(3);
  const fadePx = Math.min(240, Math.max(120, H * .22));            // same clamp() as --fade in project.css
  const dark = y < bh - fadePx * .7 - 60, darkB = bh - y - fadePx * .6 > H - 40;
  if (dark !== lastDark){ document.body.classList.toggle('dark-top', dark); lastDark = dark; }
  if (darkB !== lastDarkB){ document.body.classList.toggle('dark-bottom', darkB); lastDarkB = darkB; }

  if (bannerWheel){                                       // banner wheel turns on its own and cycles formats
    bannerWheel.set(t * 5 + y * .03, 0); bannerWheel.set(-t * 3 - y * .03, 1);
    bannerWheel.pick(Math.floor(t / 1.6) % bannerWheel.inner.length);
  }

  if (gal){                                              // vertical scroll drives the horizontal strip
    const r = gal.getBoundingClientRect(), gp = clamp(-r.top / (gal.offsetHeight - H));
    const dist = Math.max(0, strip.scrollWidth - innerWidth);
    strip.style.transform = `translate3d(${(-gp * dist).toFixed(1)}px,0,0)`;
    galBar.style.transform = `scaleX(${gp.toFixed(4)})`;
  }

  if (sectionWheel && wsec){                             // rings turn and a format gets picked as you scroll
    const r = wsec.getBoundingClientRect(), wp = clamp(-r.top / (wsec.offsetHeight - H));
    sectionWheel.set(wp * 360 + t * 2, 0); sectionWheel.set(-(wp * 360 + 20) - t * 2, 1);
    const k = Math.min(sectionWheel.inner.length - 1, Math.floor(wp * sectionWheel.inner.length));
    sectionWheel.pick(k);
    const to = sectionWheel.inner[k].toLowerCase();
    if (to !== lastTo && toEl){ toEl.textContent = '.' + to; lastTo = to; }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* while testing locally, Download buttons use the local file (the public one lives on GitHub Releases) */
if (/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname)) $$('a[data-local]').forEach(a => a.setAttribute('href', a.dataset.local));
