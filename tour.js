// ShapeShifter tour (generated from the tour artifact). Loads the real conversion graph and draws the wheel, route finder and atlas.
(function () {
  var root = document.getElementById('t-bench');
  if (!root) return;
  fetch('../assets/shapeshifter-data.json').then(function (r) { return r.json(); }).then(function (D) {

    var CATS = ['image','video','audio','document','data','inferred','tool','archive','model','font','code','subtitle','security','program'];
  var CAT_NAME = {image:'Images',video:'Video',audio:'Audio',document:'Documents',data:'Data and tables',inferred:'Inferred',tool:'Tools',archive:'Archives',model:'3D models',font:'Fonts',code:'Code and text',subtitle:'Subtitles',security:'Keys and certificates',program:'Programs (refused)'};
  var el = function (id) { return document.getElementById('t-' + id); };
  var css = function (c) { return 'var(--c-' + c + ')'; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var up = function (f) { return String(f).toUpperCase(); };

  // ---- stats and legend
  var S = D.stats;
  el('stats').innerHTML = [[S.formats, 'file types it knows'], [S.sources, 'you can start from'], [S.pairs.toLocaleString(), 'conversions, direct or chained'], [S.engines, 'engines, built in or optional']]
    .map(function (x) { return '<div class="tstat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
  el('legend').innerHTML = ['image','video','audio','document','data','archive','inferred','tool'].map(function (c) { return '<span><i style="background:' + css(c) + '"></i>' + CAT_NAME[c] + '</span>'; }).join('');

  // ---- picker
  var GROUPS = [['Photos', ['jpg','png','heic','nef','gif','webp']], ['Documents', ['pdf','docx','doc','rtf','md','epub']], ['Sheets', ['xlsx','xls','csv','json']],
    ['Slides', ['pptx','ppt','odp']], ['Media', ['mp4','mkv','mp3','srt']], ['Other', ['msg','zip','glb','ttc','svg']]];
  var current = 'jpg', selected = null;
  el('picker').innerHTML = GROUPS.map(function (g) {
    return '<div class="grp"><span class="eyebrow">' + g[0] + '</span>' + g[1].filter(function (f) { return D.plans[f]; }).map(function (f) {
      return '<button class="chip" data-f="' + f + '" aria-pressed="false">.' + f + '</button>'; }).join('') + '</div>';
  }).join('');
  el('picker').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) setSource(b.dataset.f); });

  // ---- wheel
  var NS = 'http://www.w3.org/2000/svg';
  var RINGS = [[78, 150, 12], [158, 218, 20], [226, 282, 40]];
  function polar(r, a) { var t = (a - 90) * Math.PI / 180; return [300 + r * Math.cos(t), 300 + r * Math.sin(t)]; }
  function arc(r0, r1, a0, a1) {
    var p = [polar(r1, a0), polar(r1, a1), polar(r0, a1), polar(r0, a0)], big = a1 - a0 > 180 ? 1 : 0;
    return 'M' + p[0] + 'A' + r1 + ' ' + r1 + ' 0 ' + big + ' 1 ' + p[1] + 'L' + p[2] + 'A' + r0 + ' ' + r0 + ' 0 ' + big + ' 0 ' + p[3] + 'Z';
  }
  function order(src) {
    var srcCat = D.formats[src] ? D.formats[src].c : 'image';
    var rank = function (c) { var i = CATS.indexOf(c); return c === srcCat ? -1 : (c === 'inferred' ? 4.5 : i); };
    return D.plans[src].slice().sort(function (a, b) { return rank(a.c) - rank(b.c) || a.n - b.n || a.l.localeCompare(b.l); });
  }
  function drawWheel(src) {
    var svg = el('wheel'), items = order(src), start = 0;
    svg.innerHTML = '';
    RINGS.forEach(function (ring, ri) {
      var left = items.length - start, count = ri === RINGS.length - 1 ? left : Math.min(ring[2], left);
      if (count <= 0) return;
      var g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'ring'); g.style.animationDelay = (ri * 0.12) + 's';
      var span = 360 / count;
      items.slice(start, start + count).forEach(function (it, i) {
        var a0 = i * span + 0.8, a1 = (i + 1) * span - 0.8;
        var seg = document.createElementNS(NS, 'g'); seg.setAttribute('class', 'seg'); seg.setAttribute('tabindex', '0'); seg.setAttribute('role', 'button');
        seg.setAttribute('aria-label', up(src) + ' to ' + it.l + (it.ways.length ? ', asks how' : ''));
        var path = document.createElementNS(NS, 'path'); path.setAttribute('d', arc(ring[0], ring[1], a0, a1)); path.setAttribute('fill', css(it.inf ? 'inferred' : it.c));
        var mid = polar((ring[0] + ring[1]) / 2, (a0 + a1) / 2), t = document.createElementNS(NS, 'text');
        t.setAttribute('x', mid[0]); t.setAttribute('y', mid[1] + 4); t.setAttribute('text-anchor', 'middle');
        t.textContent = it.l.length > 7 ? it.k.toUpperCase() : it.l;
        if (span < 9) t.setAttribute('font-size', '9'); if (span < 6) t.textContent = '';
        seg.appendChild(path); seg.appendChild(t); g.appendChild(seg);
        var pick = function () { select(src, it, seg); };
        seg.addEventListener('mouseenter', pick); seg.addEventListener('focus', pick); seg.addEventListener('click', pick);
        seg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      svg.appendChild(g); start += count;
    });
    var used = RINGS.reduce(function (n, r, i) { return (items.length > RINGS.slice(0, i).reduce(function (a, x) { return a + x[2]; }, 0)) ? i : n; }, 0);
    var outer = RINGS[used][1] + 16;
    svg.setAttribute('viewBox', (300 - outer) + ' ' + (300 - outer) + ' ' + (outer * 2) + ' ' + (outer * 2));
    var hub = document.createElementNS(NS, 'g'); hub.setAttribute('class', 'hub');
    hub.innerHTML = '<circle cx="300" cy="300" r="62" fill="var(--soft)" stroke="var(--line)"/><text x="300" y="304" font-size="30" font-weight="700">' + up(src) + '</text><text x="300" y="328" font-size="11" fill="var(--muted)" style="fill:var(--muted)">convert to…</text>';
    svg.appendChild(hub);
  }
  function select(src, it, seg) {
    el('wheel').querySelectorAll('.seg.sel').forEach(function (n) { n.classList.remove('sel'); });
    if (seg) seg.classList.add('sel');
    selected = it;
    var f = D.formats[src] || {n: up(src)}, t = D.formats[it.k] || {n: it.l};
    var steps = it.v || '', multi = it.n > 1;
    var html = '<div class="route"><span>' + up(src) + '</span><span class="arrow">→</span><span style="color:' + css(it.inf ? 'inferred' : it.c) + '">' + esc(it.l) + '</span></div>';
    html += '<div><span class="tag">' + esc(f.n) + '</span> <span class="tag">' + esc(t.n) + '</span>' + (it.inf ? ' <span class="tag inf">inferred</span>' : '') + (multi ? ' <span class="tag">' + it.n + ' steps</span>' : '') + '</div>';
    html += '<dl class="kv"><dt>Route</dt><dd>' + esc(steps) + '</dd>';
    html += '<dt>Loses</dt><dd>' + (it.w.length ? '<ul>' + it.w.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : 'Nothing notable.') + '</dd>';
    if (it.ways.length) html += '<dt>Asks how</dt><dd><ul>' + it.ways.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul><span class="note">Asked only if the file has more than one frame, sheet or page.</span></dd>';
    el('panel').innerHTML = html + '</dl>';
  }
  function setSource(src) {
    current = src;
    el('picker').querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.f === src ? 'true' : 'false'); });
    drawWheel(src);
    var first = order(src)[0];
    if (first) select(src, first, el('wheel').querySelector('.seg'));
    var acts = (D.actions[src] || []), combos = {image:'Select several pictures to combine them into one GIF, PDF, deck or slideshow.', pdf:'Select several PDFs to merge them.', csv:'Select several CSV files to make one workbook.', xlsx:'Select several workbooks to make one.', docx:'Select several documents to make one PDF, DOCX or Markdown.', md:'Select several documents to make one PDF, DOCX or Markdown.', pptx:'Select several decks to join them.', mp4:'Select several clips to join them.', mp3:'Select several clips to join them.', ttf:'Select several fonts to make a TTC.'};
    var cat = D.formats[src] ? D.formats[src].c : '';
    var h = '';
    if (acts.length) h += '<div class="row"><span class="eyebrow">Same-format actions</span>' + acts.map(function (a) { return '<span class="pill"><b>' + esc(a.t) + '</b>' + esc(a.ways.length ? a.ways.join(' · ') : a.n) + '</span>'; }).join('') + '</div>';
    var cm = combos[src] || (cat === 'image' ? combos.image : '');
    if (cm) h += '<div class="row"><span class="eyebrow">With several files</span><span class="note">' + esc(cm) + '</span></div>';
    el('also').innerHTML = h;
  }
  setSource(current);

  // ---- ways table
  el('ways').innerHTML = [['GIF → PNG / JPG', 'Keep animation · First frame · Every frame · Sprite sheet'], ['Excel → CSV', 'First sheet · Every sheet, one file each'],
    ['PDF / Word / slides → PNG', 'One image per page · First page only · One tall image'], ['Video → PNG', 'Middle frame · First frame · A frame every few seconds · Contact sheet'],
    ['Video → GIF', 'Standard · Small and quick · First 10 seconds'], ['Video → MP4', 'Best match · Smaller file · No sound'], ['Picture → Word', 'Text (OCR) · Picture on a page'], ['Picture → PDF', 'Picture · Searchable']]
    .map(function (r) { return '<tr><td class="mono">' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('');

  // ---- route finder
  var srcs = Object.keys(D.plans).sort(), all = {};
  srcs.forEach(function (s) { D.plans[s].forEach(function (r) { all[r.k] = r.l; }); });
  var optFrom = srcs.map(function (s) { return '<option value="' + s + '">' + up(s) + ' · ' + esc((D.formats[s] || {}).n || '') + '</option>'; }).join('');
  var optTo = Object.keys(all).sort().map(function (k) { return '<option value="' + k + '">' + up(k) + ' · ' + esc((D.formats[k] || {}).n || '') + '</option>'; }).join('');
  el('from').innerHTML = optFrom; el('to').innerHTML = optTo;
  function route() {
    var a = el('from').value, b = el('to').value, hit = (D.plans[a] || []).filter(function (r) { return r.k === b; })[0], box = el('result');
    if (a === b) { box.innerHTML = '<p>Pick two different types.</p>'; return; }
    if (!hit) { box.innerHTML = '<p><b>No route</b> from ' + up(a) + ' to ' + up(b) + ' on this machine. It may appear with LibreOffice, 7-Zip or another optional engine, or it may simply not make sense for that pair.</p>'; return; }
    var parts = (hit.v || '').split(/ → /).filter(Boolean);
    box.innerHTML = '<div class="tsteps"><span class="tstep">' + up(a) + '</span><span class="arrow">→</span><span class="tstep" style="background:var(--accent);color:var(--on-accent)">' + up(b) + '</span><span class="tag">' + hit.n + (hit.n > 1 ? ' steps' : ' step') + '</span>' + (hit.inf ? '<span class="tag inf">inferred</span>' : '') + '</div>'
      + '<dl class="kv"><dt>Engines</dt><dd>' + esc(hit.v) + '</dd><dt>Loses</dt><dd>' + (hit.w.length ? esc(hit.w.join('; ')) : 'Nothing notable.') + '</dd>' + (hit.ways.length ? '<dt>Asks how</dt><dd>' + esc(hit.ways.join(' · ')) + '</dd>' : '') + '</dl>';
  }
  el('from').addEventListener('change', route); el('to').addEventListener('change', route);
  var EX = [['docx','png'], ['pptx','xlsx'], ['gif','pdf'], ['msg','pdf'], ['xls','epub'], ['nef','webp'], ['pdf','pptx'], ['obj','glb'], ['doc','odp']];
  el('examples').innerHTML = EX.filter(function (p) { return D.plans[p[0]] && D.plans[p[0]].some(function (r) { return r.k === p[1]; }); })
    .map(function (p) { return '<button class="chip" data-a="' + p[0] + '" data-b="' + p[1] + '">' + up(p[0]) + ' → ' + up(p[1]) + '</button>'; }).join('');
  el('examples').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; el('from').value = b.dataset.a; el('to').value = b.dataset.b; route(); });
  el('from').value = 'docx'; el('to').value = 'png'; route();

  // ---- atlas
  var byCat = {};
  Object.keys(D.formats).forEach(function (f) { var c = D.formats[f].c || 'tool'; (byCat[c] = byCat[c] || []).push(f); });
  el('atlasTitle').textContent = S.formats + ' file types it recognises';
  el('atlas').innerHTML = CATS.filter(function (c) { return byCat[c]; }).map(function (c) {
    var list = byCat[c].sort();
    return '<div class="cat" style="--cc:' + css(c) + '"><h3><i style="background:' + css(c) + '"></i>' + CAT_NAME[c] + ' <span class="n">' + list.length + '</span></h3><div class="fmts">'
      + list.map(function (f) { return '<span class="fmt' + (D.plans[f] ? '' : ' none') + '" title="' + esc(D.formats[f].n) + '">.' + f + '</span>'; }).join('') + '</div></div>';
  }).join('');
  // ---- the inspector: what is inside the file decides what is offered
  var FACTS = [
    ['gps', 'The photo has a GPS location'], ['text', 'The picture contains text'], ['frames', 'The GIF has several frames'], ['sheets', 'The workbook has several sheets'],
    ['pages', 'The document has several pages'], ['scan', 'The PDF has scanned pages'], ['sound', 'The video has sound'], ['subs', 'The video has subtitles']];
  var OPTS = [
    ['NO LOCATION', 'same-format action', 'tool', function (f) { return f.gps; }, 'Removes camera, date and GPS data'],
    ['Text (OCR) or Picture', 'Word from a picture', 'document', function (f) { return f.text; }, 'The wheel asks which Word you want'],
    ['Picture on a page', 'Word from a picture', 'document', function (f) { return !f.text; }, 'Nothing to read, so no question'],
    ['Every frame · Sprite sheet', 'GIF to picture', 'image', function (f) { return f.frames; }, 'Only if there is more than one frame'],
    ['Every sheet', 'Excel to CSV', 'data', function (f) { return f.sheets; }, 'One CSV per sheet'],
    ['One tall image · First page', 'PDF to PNG', 'document', function (f) { return f.pages; }, 'Only if there is more than one page'],
    ['OCR PDF', 'searchable PDF', 'inferred', function (f) { return f.scan; }, 'A text PDF does not need it'],
    ['MP3 · WAV · FLAC…', 'audio from video', 'audio', function (f) { return f.sound; }, 'A silent video offers no audio'],
    ['SRT · VTT', 'subtitles from video', 'subtitle', function (f) { return f.subs; }, 'Only when a subtitle track exists']];
  var facts = {gps: true, text: false, frames: true, sheets: false, pages: true, scan: false, sound: true, subs: false};
  el('switches').innerHTML = FACTS.map(function (f) {
    return '<label class="sw"><input type="checkbox" id="fact-' + f[0] + '" data-f="' + f[0] + '"' + (facts[f[0]] ? ' checked' : '') + '>' + f[1] + '</label>';
  }).join('');
  function renderLive() {
    el('live').innerHTML = OPTS.map(function (o) {
      var on = !!o[3](facts);
      return '<div class="opt ' + (on ? 'on' : 'off') + '" style="--cc:' + css(o[2]) + '"><b>' + esc(o[0]) + '</b><span>' + esc(on ? o[1] + ' · ' + o[4] : o[1] + ' · not offered') + '</span></div>';
    }).join('');
  }
  el('switches').addEventListener('change', function (e) { var i = e.target.closest('input'); if (i) { facts[i.dataset.f] = i.checked; renderLive(); } });
  renderLive();

  // ---- the Properties demo: before / after for a few kinds of file
  var PROPS = [
    {k: 'Photo (JPEG)', n: 'holiday.jpg', rows: [['Author', 'Priya N.'], ['Date taken', '2025-12-31 18:42:07'], ['Camera', 'Pixel 8'], ['Location', '13.082700, 80.270700'], ['Copyright', '(c) Priya N.']],
      acts: [['Remove location', function (r) { return r[0] === 'Location' ? 'gone' : ''; }], ['Remove everything', function () { return 'gone'; }], ['Change author', function (r) { return r[0] === 'Author' ? 'set' : ''; }]],
      note: 'The compressed picture is copied byte for byte, so nothing is recompressed.'},
    {k: 'Report (Word)', n: 'report.docx', rows: [['Title', 'Quarterly report'], ['Author', 'Priya N.'], ['Last modified by', 'R. Sharma'], ['Company', 'ACME Ltd'], ['Modified', '2026-03-02 09:15:00']],
      acts: [['Remove everything', function () { return 'gone'; }], ['Change author', function (r) { return r[0] === 'Author' ? 'set' : ''; }], ['Set company', function (r) { return r[0] === 'Company' ? 'set' : ''; }]],
      note: 'The text and layout are not touched. PDF, Excel, PowerPoint and OpenDocument work the same way.'},
    {k: 'Song (MP3)', n: 'track01.mp3', rows: [['Title', 'Monsoon'], ['Artist', 'Unknown'], ['Album', 'Untitled'], ['Year', '2019'], ['Genre', '']],
      acts: [['Fix artist', function (r) { return r[0] === 'Artist' ? 'set' : ''; }], ['Add genre', function (r) { return r[0] === 'Genre' ? 'set' : ''; }], ['Remove everything', function () { return 'gone'; }]],
      note: 'Tags are rewritten without re-encoding, so the sound is bit for bit the same.'}];
  var pstate = {i: 0, a: -1};
  function renderProps() {
    var p = PROPS[pstate.i], act = pstate.a >= 0 ? p.acts[pstate.a] : null;
    el('ptabs').innerHTML = PROPS.map(function (x, i) { return '<button type="button" data-t="' + i + '" aria-pressed="' + (i === pstate.i) + '">' + esc(x.k) + '</button>'; }).join('');
    el('pname').textContent = p.n;
    el('prows').innerHTML = p.rows.map(function (r) {
      var cls = act ? act[1](r) : '';
      var shown = cls === 'gone' ? r[1] : (cls === 'set' ? 'new value' : r[1]);
      return '<div class="fieldrow ' + cls + '"><b>' + esc(r[0]) + '</b><span class="v">' + esc(shown || '(empty)') + '</span></div>';
    }).join('');
    el('pacts').innerHTML = p.acts.map(function (a, i) { return '<button type="button" data-a="' + i + '" aria-pressed="' + (i === pstate.a) + '">' + esc(a[0]) + '</button>'; }).join('');
    el('pnote').textContent = p.note;
  }
  el('ptabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { pstate.i = +b.dataset.t; pstate.a = -1; renderProps(); } });
  el('pacts').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { pstate.a = pstate.a === +b.dataset.a ? -1 : +b.dataset.a; renderProps(); } });
  renderProps();

  }).catch(function (e) { var b = document.getElementById('t-panel'); if (b) b.textContent = 'Could not load the conversion data (' + e + ').'; });
})();
