// Interactive layer for the landing page: HUD cursor + trail, click ripples, spotlight grid, magnetic buttons,
// text scramble, portrait glitch-on-hover and a 3D wireframe behind the portrait. Reads window.HERO from app.js.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#dc143c';
  const H = () => window.HERO || { p: 0, s2: 0, smx: 0, smy: 0, time: 0 };
  if (reduce) return;

  let mx = innerWidth / 2, my = innerHeight / 2, sx = mx, sy = my, moved = false;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; moved = true; }, { passive: true });

  /* ---------- 1. HUD cursor (mouse only) ---------- */
  let ring, dot, lab;
  if (fine){
    document.body.classList.add('has-cursor');
    ring = Object.assign(document.createElement('div'), { className: 'cur-ring' });
    dot = Object.assign(document.createElement('div'), { className: 'cur-dot' });
    lab = Object.assign(document.createElement('div'), { className: 'cur-lab' });
    document.body.append(ring, dot, lab);
    document.addEventListener('pointerover', e => {
      const hot = e.target.closest && e.target.closest('a,button,.pw');
      ring.classList.toggle('hot', !!(hot && !hot.classList.contains('pw')));
      ring.classList.toggle('look', !!(hot && hot.classList.contains('pw')));
    });
    document.addEventListener('pointerleave', () => { ring.style.opacity = dot.style.opacity = lab.style.opacity = 0; });
    document.addEventListener('pointerenter', () => { ring.style.opacity = dot.style.opacity = lab.style.opacity = 1; });
  }

  /* ---------- 2. fx canvas: cursor trail + click ripples ---------- */
  const fx = Object.assign(document.createElement('canvas'), { className: 'fx' });
  document.body.append(fx);
  const g = fx.getContext('2d');
  let W = 0, Hh = 0;
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; Hh = innerHeight; fx.width = W * d; fx.height = Hh * d; g.setTransform(d, 0, 0, d, 0, 0); };
  addEventListener('resize', size); size();
  const trail = [], ripples = [];
  addEventListener('pointerdown', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (ripples.length > 8) ripples.shift();
  }, { passive: true });

  /* ---------- 3. spotlight grid ---------- */
  const spot = $('#spot');
  if (!fine && spot){                       // touch: the grid lights up where you tap, then fades
    spot.style.opacity = 0; spot.style.transition = 'opacity .8s';
    let tmr; addEventListener('pointerdown', e => { sx = mx = e.clientX; sy = my = e.clientY; spot.style.opacity = .55; clearTimeout(tmr); tmr = setTimeout(() => spot.style.opacity = 0, 700); }, { passive: true });
  }

  /* ---------- 4. magnetic buttons (mouse only) ---------- */
  const mags = fine ? $$('.contact a, .steps button, .links a.dl').map(el => ({ el, x: 0, y: 0 })) : [];
  function magnet(){
    for (const m of mags){
      const r = m.el.getBoundingClientRect();
      if (r.width === 0) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy), reach = 90 + Math.max(r.width, r.height) * .35;
      const k = d < reach ? (1 - d / reach) : 0;
      const tx = dx * k * .35, ty = dy * k * .35;
      m.x += (tx - m.x) * .2; m.y += (ty - m.y) * .2;
      m.el.style.translate = (Math.abs(m.x) + Math.abs(m.y) < .05) ? '' : `${m.x.toFixed(1)}px ${m.y.toFixed(1)}px`;
    }
  }

  /* ---------- 5. text scramble ---------- */
  const GL = '▮▯#%&*+=<>/\\01XZ';
  function scramble(el, ms = 650){
    if (!el.dataset.final) el.dataset.final = el.textContent;
    const final = el.dataset.final, n = final.length, t0 = performance.now();
    el.dataset.run = String(t0);
    (function step(now){
      if (el.dataset.run !== String(t0)) return;
      const k = clamp((now - t0) / ms);
      let out = '';
      for (let i = 0; i < n; i++){
        const c = final[i];
        out += (c === ' ' || i < k * n * 1.15 - 2) ? c : GL[(Math.random() * GL.length) | 0];
      }
      el.textContent = k >= 1 ? final : out;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  // kickers scramble whenever their block becomes visible
  const kick = $$('.kicker').map(el => ({ el, box: el.closest('.about, .work'), on: false }));
  // hover scramble on step buttons, project titles and contact buttons
  const hoverTargets = [...$$('.steps button'), ...$$('.links .t'), ...$$('.contact a')];
  hoverTargets.forEach(el => {
    const host = el.closest('a, button') || el;
    host.addEventListener('pointerenter', () => { scramble(el, 420); });
  });

  /* ---------- 6. portrait: glitch on hover / tap ---------- */
  const img = $('#portrait'), pimg = $('#pimg'), pw = $('#pw');
  const gcv = Object.assign(document.createElement('canvas'), { id: 'pglitch' });
  pimg.append(gcv);
  const gx = gcv.getContext('2d');
  let tint = null, nw = 0, nh = 0, glitchT0 = 0, glitching = false;
  function glitchSetup(){
    if (!img.naturalWidth || tint) return;
    const k = img.naturalWidth > 1000 ? .5 : 1;
    nw = Math.round(img.naturalWidth * k); nh = Math.round(img.naturalHeight * k);
    gcv.width = nw; gcv.height = nh;
    const mk = col => { const c = document.createElement('canvas'); c.width = nw; c.height = nh; const q = c.getContext('2d'); q.drawImage(img, 0, 0, nw, nh); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, nw, nh); return c; };
    tint = { red: mk(ACC), cyan: mk('#19d3ff') };
  }
  img.complete ? glitchSetup() : img.addEventListener('load', glitchSetup);
  function glitch(ms = 520){
    glitchSetup();
    if (!tint || glitching || H().s2 < .99) return;           // only after the entrance reveal has finished
    glitching = true; window.__pglitch = true; glitchT0 = performance.now();
    gcv.style.display = 'block'; img.style.opacity = 0;
    const S = 44, sh = nh / S;
    (function frame(now){
      const t = clamp((now - glitchT0) / ms), a = (1 - t) * (1 - t);
      gx.clearRect(0, 0, nw, nh);
      for (let i = 0; i < S; i++){
        const hit = Math.random() < .55 * (1 - t) + .02;
        const dx = hit ? (Math.random() - .5) * nw * .18 * a : 0, y = Math.round(i * sh), h = Math.round((i + 1) * sh) - y;
        gx.globalAlpha = 1; gx.drawImage(img, 0, y, nw, h, dx, y, nw, h);
        if (hit){
          gx.globalAlpha = .55 * a + .1;
          gx.drawImage(tint.red, 0, y, nw, h, dx + nw * .03 * a, y, nw, h);
          gx.drawImage(tint.cyan, 0, y, nw, h, dx - nw * .03 * a, y, nw, h);
        }
      }
      gx.globalAlpha = 1;
      if (t < 1) requestAnimationFrame(frame);
      else { gcv.style.display = 'none'; img.style.opacity = 1; window.__pglitch = false; glitching = false; }
    })(glitchT0);
  }
  pw.addEventListener('pointerenter', () => glitch());
  pw.addEventListener('pointerdown', () => glitch(620));
  setInterval(() => { if (H().p > .34 && H().p < .9 && !document.hidden && Math.random() < .35) glitch(380); }, 5200);   // idle flicker

  /* ---------- 7. 3D wireframe behind the portrait ---------- */
  const wire = $('#wire'), wc = wire.getContext('2d');
  const disc = $('#disc');
  const phi = (1 + Math.sqrt(5)) / 2;
  const ico = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]]
    .map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
  const icoE = []; for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) if (Math.hypot(...ico[i].map((c, k) => c - ico[j][k])) < 1.06) icoE.push([i, j]);
  const cube = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => v.map(c => c / Math.sqrt(3)));
  const cubeE = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  let wS = 0;
  function wireSize(){
    const d = Math.min(devicePixelRatio || 1, 2), s = disc.offsetWidth * 1.7;
    wS = s; wire.width = s * d; wire.height = s * d; wire.style.width = s + 'px'; wire.style.height = s + 'px';
    wire.style.left = (disc.offsetLeft + disc.offsetWidth / 2 - s / 2) + 'px'; wire.style.top = (disc.offsetTop + disc.offsetHeight / 2 - s / 2) + 'px';
    wc.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', wireSize); wireSize(); setTimeout(wireSize, 600);
  function rot(v, ax, ay){
    const [x, y, z] = v, cy = Math.cos(ay), sy2 = Math.sin(ay), cx = Math.cos(ax), sx2 = Math.sin(ax);
    const x1 = x * cy + z * sy2, z1 = -x * sy2 + z * cy, y1 = y * cx - z1 * sx2, z2 = y * sx2 + z1 * cx;
    return [x1, y1, z2];
  }
  function drawWire(){
    const h = H(), vis = clamp((h.s2 - .15) / .6);
    wc.clearRect(0, 0, wS, wS);
    if (vis <= 0.01 || !wS) return;
    const c = wS / 2, t = h.time;
    const ay = t * .28 + h.p * 7 + h.smx * 1.4, ax = t * .17 + h.p * 3.2 - h.smy * 1.2;
    const proj = (v, R) => { const d = 3.2, k = d / (d - v[2]); return [c + v[0] * R * k, c + v[1] * R * k, v[2]]; };
    const draw = (verts, edges, R, ay2, ax2, col, a, lw) => {
      const P = verts.map(v => proj(rot(v, ax2, ay2), R));
      wc.lineWidth = lw; wc.strokeStyle = col;
      for (const [i, j] of edges){
        const front = (P[i][2] + P[j][2]) / 2;
        wc.globalAlpha = vis * a * (.35 + .65 * (front + 1) / 2);
        wc.beginPath(); wc.moveTo(P[i][0], P[i][1]); wc.lineTo(P[j][0], P[j][1]); wc.stroke();
      }
      wc.fillStyle = col;
      for (const p of P){ wc.globalAlpha = vis * Math.min(1, a * 2.2) * (.4 + .6 * (p[2] + 1) / 2); wc.fillRect(p[0] - 2, p[1] - 2, 4, 4); }
    };
    draw(ico, icoE, wS * .39, ay, ax, '#0b0b0c', .42, 1);
    draw(cube, cubeE, wS * .22, -ay * 1.6, -ax * 1.3, ACC, .8, 1.2);
    // an orbiting satellite
    const o = rot([Math.cos(t * .9), 0, Math.sin(t * .9)], .5, 0), q = proj(o, wS * .46);
    wc.globalAlpha = vis; wc.fillStyle = ACC; wc.beginPath(); wc.arc(q[0], q[1], 3.2, 0, 6.283); wc.fill();
    wc.globalAlpha = 1;
  }

  /* ---------- main loop ---------- */
  function loop(now){
    // smooth pointer
    sx += (mx - sx) * .22; sy += (my - sy) * .22;
    if (fine && moved){
      ring.style.transform = `translate(${sx}px,${sy}px)`;
      dot.style.transform = `translate(${mx}px,${my}px)`;
      lab.style.transform = `translate(${mx + 18}px,${my + 16}px)`;
      lab.textContent = `X ${String(Math.round(mx)).padStart(4, '0')}  Y ${String(Math.round(my)).padStart(4, '0')}`;
      trail.push({ x: mx, y: my, t: now });
    }
    while (trail.length && now - trail[0].t > 420) trail.shift();
    // fx canvas
    g.clearRect(0, 0, W, Hh);
    if (trail.length > 1){
      for (let i = 1; i < trail.length; i++){
        const a = 1 - (now - trail[i].t) / 420;
        g.strokeStyle = ACC; g.globalAlpha = Math.max(0, a) * .55; g.lineWidth = 1 + a * 2.2;
        g.beginPath(); g.moveTo(trail[i - 1].x, trail[i - 1].y); g.lineTo(trail[i].x, trail[i].y); g.stroke();
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--){
      const r = ripples[i], k = (now - r.t) / 900;
      if (k >= 1){ ripples.splice(i, 1); continue; }
      const e = 1 - Math.pow(1 - k, 3);
      g.strokeStyle = ACC; g.lineWidth = 2 - k;
      g.globalAlpha = (1 - k) * .9; g.beginPath(); g.arc(r.x, r.y, 8 + e * 170, 0, 6.283); g.stroke();
      g.globalAlpha = (1 - k) * .5; g.beginPath(); g.arc(r.x, r.y, 4 + e * 90, 0, 6.283); g.stroke();
      const s = 14 + e * 60; g.globalAlpha = (1 - k) * .8; g.lineWidth = 1.5;     // corner brackets expanding
      for (const [sx2, sy2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]){
        g.beginPath(); g.moveTo(r.x + sx2 * s, r.y + sy2 * (s - 9)); g.lineTo(r.x + sx2 * s, r.y + sy2 * s); g.lineTo(r.x + sx2 * (s - 9), r.y + sy2 * s); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // spotlight grid follows the pointer (also on touch: last touch point)
    if (spot){ spot.style.setProperty('--mx', sx + 'px'); spot.style.setProperty('--my', sy + 'px'); }
    magnet();
    // scramble kickers when their block fades in
    for (const k of kick){
      const op = k.box ? parseFloat(k.box.style.opacity || '0') : 1;
      if (op > .6 && !k.on){ k.on = true; scramble(k.el, 700); } else if (op < .15) k.on = false;
    }
    drawWire();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
