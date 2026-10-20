// Page transitions between the landing page and the project pages (and between project pages).
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLS = innerWidth < 700 ? 4 : 6;
  const HOME = { name: 'ETHIHAS', num: '00', label: 'HOME', bg: '#ffffff', fg: '#0b0b0c', ac: '#dc143c' };
  const DEST = {
    trustme:      { name: 'TrustMe',      num: '01', label: 'SECURITY',  bg: '#05070b', fg: '#ffffff', ac: '#6aa4ff' },
    tether:       { name: 'Tether',       num: '02', label: 'FILE SYNC', bg: '#08201c', fg: '#ffffff', ac: '#3fc2ad' },
    lekalu:       { name: 'Lekalu',       num: '03', label: 'FINANCE',   bg: '#0f172a', fg: '#ffffff', ac: '#60a5fa' },
    shapeshifter: { name: 'ShapeShifter', num: '04', label: 'DESKTOP',   bg: '#18191e', fg: '#ffffff', ac: '#8f9bff' },
  };
  const destFor = url => { const m = url.pathname.match(/projects\/([a-z]+)\.html$/i); return (m && DEST[m[1].toLowerCase()]) || HOME; };

  let ov = null, busy = false;
  function build(d){
    if (ov) ov.remove();
    ov = document.createElement('div'); ov.className = 'pt'; ov.setAttribute('aria-hidden', 'true');
    ov.style.setProperty('--pt-bg', d.bg); ov.style.setProperty('--pt-fg', d.fg); ov.style.setProperty('--pt-ac', d.ac);
    for (let i = 0; i < COLS; i++){ const c = document.createElement('i'); c.className = 'pt-c'; c.style.setProperty('--i', i); ov.append(c); }
    const l = document.createElement('div'); l.className = 'pt-label';
    l.innerHTML = `<small>[ ${d.num} ] ${d.label}</small><b>${d.name}</b>`; ov.append(l);
    const b = document.createElement('div'); b.className = 'pt-bar'; b.innerHTML = '<i></i>'; ov.append(b);
    document.body.append(ov); return ov;
  }

  /* ---------- arriving: we are covered, wait a beat, then lift the curtain ---------- */
  let arriving = null;
  try { const v = JSON.parse(sessionStorage.getItem('pt') || 'null'); if (v && Date.now() - v.t < 8000) arriving = v; } catch (e) {}
  if (arriving && !reduce){
    const go = () => {
      build(arriving); ov.classList.add('on', 'nox', 'in');
      void ov.offsetWidth; ov.classList.remove('nox');
      const ready = Promise.all([document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 380))]);
      ready.then(() => {
        root.classList.remove('pt-cover');
        window.dispatchEvent(new Event('pt:reveal'));
        window.SFX && window.SFX.arrive();
        ov.classList.remove('in'); ov.classList.add('out');
        setTimeout(() => { ov.classList.remove('on', 'out'); try { sessionStorage.removeItem('pt'); } catch (e) {} }, 1100);
      });
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  } else {
    root.classList.remove('pt-cover');
    try { sessionStorage.removeItem('pt'); } catch (e) {}
  }

  /* ---------- leaving: intercept internal links ---------- */
  function leave(url, d){
    if (busy) return; busy = true;
    if (window.__lenis) window.__lenis.stop();
    window.SFX && window.SFX.leave();
    window.SFX && window.SFX.amb && window.SFX.amb.fadeOut(.8);
    build(d); ov.classList.add('on'); void ov.offsetWidth; ov.classList.add('in');
    try { sessionStorage.setItem('pt', JSON.stringify(Object.assign({}, d, { t: Date.now() }))); } catch (e) {}
    setTimeout(() => { location.href = url.href; }, 1000);
  }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash){                 // in-page anchor: smooth scroll
      const t = document.querySelector(url.hash);
      if (t){
        e.preventDefault(); const y = t.getBoundingClientRect().top + scrollY - 10;
        window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.3 }) : window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      }
      return;
    }
    if (url.pathname === location.pathname) return;
    if (!/\.html$|\/$/.test(url.pathname)) return;                         // only pages, not files
    if (reduce) return;
    e.preventDefault();
    leave(url, destFor(url));
  });

  // coming back with the browser's back button: never show a stuck curtain
  addEventListener('pageshow', e => {
    if (e.persisted){ busy = false; if (ov) ov.classList.remove('on', 'in', 'out'); if (window.__lenis) window.__lenis.start(); root.classList.remove('pt-cover'); }
  });
})();
