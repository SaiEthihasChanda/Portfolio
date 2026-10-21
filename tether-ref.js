// Tether CLI reference: workflows, searchable command reference, modes explorer. Data lives in assets/tether-cli.json.
(function () {
  var root = document.getElementById('tref');
  if (!root) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1100); };
    try { navigator.clipboard.writeText(text).then(done, function () { btn.textContent = 'Ctrl+C'; }); } catch (e) { btn.textContent = 'Ctrl+C'; }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.tr-copy'); if (!b) return;
    e.stopPropagation(); copy(b.dataset.text || (b.previousElementSibling && b.previousElementSibling.textContent) || '', b);
  });
  var box = function (text) { return '<div class="tr-ex"><pre>' + esc(text).replace(/^(\s*#.*)$/gm, '<span class="c">$1</span>') + '</pre><button type="button" class="tr-copy" data-text="' + esc(text) + '">Copy</button></div>'; };

  fetch('../assets/tether-cli.json').then(function (r) { return r.json(); }).then(function (D) {
    /* ---------- workflows ---------- */
    var fl = 0;
    function drawFlow() {
      $('#tr-tabs', root).innerHTML = D.flows.map(function (f, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === fl) + '">' + esc(f.t) + '</button>'; }).join('');
      $('#tr-steps', root).innerHTML = D.flows[fl].s.map(function (s, i) {
        return '<div class="tr-step"><span class="n">0' + (i + 1) + '</span><div><h3>' + esc(s[0]) + '</h3>' + box(s[1]) + '<p>' + esc(s[2]) + '</p></div></div>';
      }).join('');
    }
    $('#tr-tabs', root).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { fl = +b.dataset.i; drawFlow(); } });
    $('#tr-steps', root).addEventListener('click', function (e) { var s = e.target.closest('.tr-step'); if (!s || e.target.closest('.tr-copy')) return; var on = s.classList.contains('on'); root.querySelectorAll('.tr-step.on').forEach(function (x) { x.classList.remove('on'); }); if (!on) s.classList.add('on'); });
    drawFlow();

    /* ---------- reference ---------- */
    var total = 0;
    var groupsHTML = D.groups.map(function (g) {
      total += g.cmds.length;
      var cards = g.cmds.map(function (c) {
        var h = '<article class="tr-cmd" data-k="' + esc(c.keys) + '"><h4><b>' + esc(c.sig) + '</b> <i>' + esc(c.args) + '</i></h4>';
        if (c.tags.length) h += '<div class="tr-tags">' + c.tags.map(function (t) { return '<span class="tr-tag ' + t[0] + '">' + esc(t[1]) + '</span>'; }).join('') + '</div>';
        h += '<p>' + c.desc + '</p>';
        if (c.opts.length) h += '<div class="tr-ow"><table>' + c.opts.map(function (o) { return '<tr><td>' + esc(o[0]) + '</td><td>' + o[1] + '</td></tr>'; }).join('') + '</table></div>';
        if (c.sig === 'tether config set') h += '<div class="tr-ow"><table><tr><th>Key</th><th>What it does</th><th>Default</th></tr>' + D.settings.map(function (s) { return '<tr><td>' + esc(s[0]) + '</td><td>' + s[1] + '</td><td>' + esc(s[2]) + '</td></tr>'; }).join('') + '</table></div>';
        if (c.ex) h += box(c.ex);
        if (c.note) h += '<p class="tr-note">' + c.note + '</p>';
        return h + '</article>';
      }).join('');
      return '<section class="tr-group" id="c-' + g.id + '" data-g="' + g.id + '"><h3>' + esc(g.title.replace('&amp;', '&')) + '</h3>' + (g.intro ? '<p>' + g.intro + '</p>' : '') + cards + '</section>';
    }).join('');
    $('#tr-groups', root).innerHTML = groupsHTML + '<p class="tr-empty" id="tr-empty">No command matches that. Try a word like <em>share</em>, <em>git</em> or <em>conflict</em>.</p>';
    $('#tr-index', root).innerHTML = D.groups.map(function (g) { return '<a href="#c-' + g.id + '" data-g="' + g.id + '">' + esc(g.title) + ' <span>' + g.cmds.length + '</span></a>'; }).join('');
    var cards = [].slice.call(root.querySelectorAll('.tr-cmd')), groups = [].slice.call(root.querySelectorAll('.tr-group')), cnt = $('#tr-count', root), q = $('#tr-q', root);
    cnt.textContent = total + ' COMMANDS';
    q.addEventListener('input', function () {
      var term = q.value.trim().toLowerCase(), shown = 0;
      cards.forEach(function (c, i) {
        var hit = !term || (c.dataset.k + ' ' + c.textContent).toLowerCase().indexOf(term) >= 0;
        c.hidden = !hit; if (hit) shown++;
      });
      groups.forEach(function (g) { g.hidden = !!term && !g.querySelector('.tr-cmd:not([hidden])'); });
      $('#tr-empty', root).style.display = term && !shown ? 'block' : 'none';
      cnt.textContent = term ? shown + ' OF ' + total + ' COMMANDS' : total + ' COMMANDS';
    });
    // highlight the group in view
    var links = [].slice.call(root.querySelectorAll('#tr-index a'));
    function spy() {
      var cur = null, y = window.innerHeight * .32;
      groups.forEach(function (g) { if (!g.hidden && g.getBoundingClientRect().top < y) cur = g.dataset.g; });
      links.forEach(function (a) { a.classList.toggle('on', a.dataset.g === cur); });
    }
    addEventListener('scroll', spy, { passive: true }); spy();

    /* ---------- modes explorer ---------- */
    var mi = 0;
    function drawMode() {
      var m = D.modes[mi];
      $('#tr-mlist', root).innerHTML = D.modes.map(function (x, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === mi) + '">' + esc(x.k) + '<i>0' + (i + 1) + '</i></button>'; }).join('');
      $('#tr-mpanel', root).innerHTML = '<h3>' + esc(m.k) + '</h3><p>' + m.d + '</p>' + (m.edits ? '<div class="tr-mrow"><b>Your edits</b><span>' + esc(m.edits) + '</span></div><div class="tr-mrow"><b>Incoming versions</b><span>' + esc(m.incoming) + '</span></div>' : '<div class="tr-mrow"><b>Next step</b><span><code>tether locate</code></span></div>');
    }
    $('#tr-mlist', root).addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { mi = +b.dataset.i; drawMode(); } });
    $('#tr-mlist', root).addEventListener('mouseover', function (e) { var b = e.target.closest('button'); if (b && +b.dataset.i !== mi && matchMedia('(hover:hover)').matches) { mi = +b.dataset.i; drawMode(); } });
    drawMode();
    $('#tr-choices', root).innerHTML = D.choices.map(function (c) { return '<div class="tr-choice"><b>' + esc(c[0]) + '</b><span>' + c[1] + '</span></div>'; }).join('');
  }).catch(function (e) { var s = $('#tr-steps', root); if (s) s.textContent = 'Could not load the CLI reference (' + e + ').'; });
})();
