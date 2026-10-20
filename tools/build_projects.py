"""Generates projects/<slug>.html from the data below. Edit the data, run `python tools/build_projects.py`."""
import os, html

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "projects")
os.makedirs(OUT, exist_ok=True)

# Colour scheme per project, taken from each app's own palette. Everything else about the pages is shared.
#   accent    : on light backgrounds      accent_lt : on the dark banner
#   bn        : banner / dark panels      bg        : page background      ink : text
SCHEMES = {
    "trustme":      dict(accent="#1a6ae0", accent_lt="#6aa4ff", bn="#05070b", bg="#f5f7fb", ink="#0b1220"),   # TrustMe console blue on near-black
    "tether":       dict(accent="#0b7f72", accent_lt="#3fc2ad", bn="#08201c", bg="#f3f8f6", ink="#0a1412"),   # Tether console teal on deep green
    "lekalu":       dict(accent="#2563eb", accent_lt="#60a5fa", bn="#0f172a", bg="#f4f7fc", ink="#0f172a"),   # Lekalu slate navy + blue
    "shapeshifter": dict(accent="#4f5fe8", accent_lt="#8f9bff", bn="#18191e", bg="#f6f6fa", ink="#14151a"),   # ShapeShifter midnight + indigo
}

# The installer is too big for the repo (GitHub's limit is 100 MB per file), so it is attached to a GitHub Release.
# The installer lives on the shapeshifter repo release. While testing on localhost the button uses the local file.
DOWNLOAD_URL = "https://github.com/SaiEthihasChanda/shapeshifter/releases/latest/download/ShapeShifter-Setup.exe"

PROJECTS = [
    dict(
        slug="trustme", name="TrustMe", num="01",
        kicker="SECURITY · DEVELOPER TOOL",
        tagline="A secret manager where the key that proves an application's identity never leaves the machine it belongs to.",
        meta=[("TYPE", "Secret manager"), ("STACK", "ECDSA P-256 · Argon2id · AES-256-GCM"), ("BUILT WITH", "React · Firebase · Java / Python / JS libraries"), ("STATUS", "Live")],
        cta=[("Open the console ↗", "https://trustme-33ab7.web.app", True, "")],
        media=dict(kind="video", src="../assets/videos/trustme.mp4", poster="../assets/videos/trustme.jpg"),
        stats=[("P-256", "ECDSA key that never leaves your machine"), ("60 s", "lifetime of every signed, single-use request"), ("3", "client libraries: Java, Python and JavaScript")],
        features=[
            ("The key stays home", "Each application holds one .TM file containing an ECDSA P-256 private key, encrypted at rest with a password only you know."),
            ("Signed, single-use requests", "To read a secret, the library unlocks the key in your own process, signs a 60-second assertion and sends only the signature."),
            ("A breach can't forge anything", "The server stores just the public half of the key, so a full database breach cannot forge a request for any application."),
            ("One line to read a secret", "TrustMe.get(\"STRIPE_API_KEY\"). The same call exists in the Java, Python and JavaScript libraries."),
            ("Made for pipelines", "Supply the password on stdin or from a file. There is a Jenkins recipe, and no environment variables to leak."),
            ("Share with your team", "Invite people by Google account email. Members can read and change secrets; only the owner can delete the app or manage access."),
        ],
        how_title="How a secret is read",
        steps=[("UNLOCK", "Open the key", "The library finds the .TM file and unlocks it with your password (Argon2id, then AES-256-GCM)."),
               ("SIGN", "Prove who you are", "It signs a short-lived, single-use assertion with the private key, inside your own process."),
               ("VERIFY", "Get the secret", "The cloud function checks the signature, rejects replays and expired assertions, then returns the value.")],
        code=("JAVA", '<span class="c">// the key file and password are asked for once, at start-up</span>\nString key = <span class="k">TrustMe</span>.get("STRIPE_API_KEY");'),
        final="Secrets without the risk.",
    ),
    dict(
        slug="tether", name="Tether", num="02",
        kicker="FILE SYNC · CLI + CLOUD",
        tagline="Keeps files and folders identical to a central source of truth, wherever they live on Windows or Linux.",
        meta=[("TYPE", "File sync for teams"), ("STACK", "Node.js · SQLite · chunked delta sync"), ("BUILT WITH", "Firebase (Firestore, Storage, Auth) · React console"), ("STATUS", "Live")],
        cta=[("Open the console ↗", "https://tether-b10cf.web.app", True, "")],
        media=dict(kind="video", src="../assets/videos/tether.mp4", poster="../assets/videos/tether.jpg"),
        stats=[("1 of 241", "chunks sent after a small edit: 9 KB over the wire"), ("121", "end-to-end tests with real servers, daemons and browsers"), ("2", "platforms: Windows and Linux")],
        features=[
            ("A CLI and a background daemon", "The tether command manages files; tetherd keeps them in sync in the background and starts at login."),
            ("Delta sync", "Files are split into content-defined chunks and only the missing chunks travel, so a one-line edit stays tiny."),
            ("Share with an ID", "Manage a file, get a share ID, and run tether pull on another machine or account."),
            ("Live editing sessions", "With tether edit --realtime, every save is pushed live to everyone until you run tether done."),
            ("Git-aware", "Inside a git repo you choose keep, skip or follow, so Tether never gets in the way of git status or pulls."),
            ("Web console and roles", "Create repos, invite editors by email and review everything in the console. Desktop notifications cover conflicts and revoked access."),
        ],
        how_title="Try it in four commands",
        steps=[("LOGIN", "Sign in", "tether login opens a browser sign-in. The hosted service is the default."),
               ("MANAGE", "Put a file under Tether", "tether manage prints a share ID for the file you chose."),
               ("PULL", "Get it anywhere", "tether pull with that ID creates an identical copy on any other machine.")],
        code=("TERMINAL", '<span class="k">$</span> tether login\n<span class="k">$</span> tether repo create team\n<span class="k">$</span> tether manage .editorconfig --repo team   <span class="c"># prints a share ID</span>\n<span class="k">$</span> tether pull abcd-efgh-jkmn                   <span class="c"># on another machine</span>'),
        final="One source of truth.",
    ),
    dict(
        slug="lekalu", name="Lekalu", num="03",
        kicker="PERSONAL FINANCE · WEB + ANDROID",
        tagline="An expense tracker with a trading-app feel. Follow your money by day, by month and by year.",
        meta=[("TYPE", "Expense tracker"), ("STACK", "React 18 · Vite · Tailwind CSS · Recharts"), ("BUILT WITH", "Firebase Auth and Firestore"), ("STATUS", "Live")],
        cta=[("Open the app ↗", "https://lekalu.web.app", True, "")],
        media=dict(kind="gallery", items=[
            ("1", "Activity: today's money in and out, with net flow."),
            ("2", "Trackables: recurring income and expenses."),
            ("3", "Tracker: tick items off for the month."),
            ("4", "Analytics: a master view of everything."),
            ("5", "Per-trackable totals, month by month."),
            ("6", "Filter by time range, account or trackable."),
            ("7", "Daily income against expense, charted."),
        ]),
        stats=[("4", "sections: Activity, Trackables, Tracker, Analytics"), ("Cloud", "synced across devices with email sign-in"), ("Web + Android", "one codebase, two platforms")],
        features=[
            ("Activity", "Add income and expenses with an amount and a trackable. See the day's total income, expenses and net flow at a glance."),
            ("Trackables", "Create recurring monthly or yearly items and link each to a bank account or card."),
            ("Tracker", "Mark recurring items done for the month. Ticking one adds the activity for you, with a progress percentage."),
            ("Analytics", "Filter by time range, account or trackable, then read income, expenses, net flow, the expense/income ratio and category breakdowns."),
            ("Smart about card bills", "Credit-card bills are treated as self-transfers, so they never inflate your totals."),
            ("Private by design", "Each user signs in and only ever sees their own data, synced through Firebase."),
        ],
        how_title=None, steps=None, code=None,
        final="Know where it goes.",
    ),
    dict(
        slug="shapeshifter", name="ShapeShifter", num="04",
        kicker="WINDOWS DESKTOP APP · PYTHON",
        tagline="Convert any file to another format in place, straight from File Explorer. Select, press a shortcut, point and click.",
        meta=[("TYPE", "Windows desktop app"), ("STACK", "Python · PySide6 · PyMuPDF · ffmpeg"), ("VERSION", "2.3.0 · Windows 10 / 11"), ("INSTALL", "Per-user, no admin rights needed")],
        cta=[("↓ Download ShapeShifter", "../downloads/ShapeShifter-Setup-2.3.0.exe", True, "147 MB")],
        media=dict(kind="wheel"),
        stats=[("360+", "file types it knows by name, plus anything it can infer"), ("0", "admin rights needed: it installs for your account only"), ("Ctrl+Alt+C", "opens the wheel for the selected files")],
        features=[
            ("The wheel", "Right-click › Convert to… or press Ctrl+Alt+C. A wheel of everything the file can become appears under your mouse. Past 12 options, they spread over rotating rings."),
            ("In place", "holiday.jpg becomes holiday.png in the same folder, and the original goes to the Recycle Bin."),
            ("Knows what a file really is", "It reads byte signatures, containers, text and ffmpeg's media probe, so renamed or extension-less files still work."),
            ("A graph of conversions", "Every file type is a node and every step an edge, so multi-step routes like DOCX → PDF → PNG are found automatically."),
            ("Learns reverse conversions", "Convert A → B once and it remembers that B → A is wanted, with a warning badge when the route loses something."),
            ("Documents keep their pictures", "PDF and Word output keeps images, links, tables, lists and non-Latin text. Nothing is silently dropped."),
        ],
        how_title=None, steps=None, code=None,
        final="Any file. Any format.",
    ),
]


def esc(s): return html.escape(s, quote=True)


def rgb(h): return ",".join(str(int(h[i:i + 2], 16)) for i in (1, 3, 5))


def scheme_style(slug):
    c = SCHEMES[slug]
    return (f"--accent:{c['accent']};--accent-lt:{c['accent_lt']};--bn:{c['bn']};--bn-rgb:{rgb(c['bn'])};"
            f"--bg:{c['bg']};--ink:{c['ink']};--ink-rgb:{rgb(c['ink'])}")


def meta_rows(p):
    return "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in p["meta"])


def cta_buttons(p):
    out = []
    for label, href, primary, note in p["cta"]:
        local = ""
        if "downloads/" in href:                       # installer: public link, local file only while developing
            local, href = href, DOWNLOAD_URL
        ext = href.startswith("http") and not local
        attrs = ' target="_blank" rel="noopener"' if ext else (f' download data-local="{esc(local)}"' if local else " download")
        small = f" <small>{esc(note)}</small>" if note else ""
        out.append(f'<a class="btn{" primary" if primary else ""}" href="{esc(href)}"{attrs}>{esc(label)}{small}</a>')
    return "\n          ".join(out)


def banner_media(p):
    m = p["media"]
    if m["kind"] == "video":
        return ('<div class="bn-media">'
                f'<div class="bn-poster" style="background-image:url({m["poster"]})"></div>'
                f'<video autoplay muted loop playsinline preload="auto" poster="{m["poster"]}"><source src="{m["src"]}" type="video/mp4"></video>'
                '</div>')
    if m["kind"] == "gallery":
        order = [[1, 4, 7], [2, 5, 1], [3, 6, 2], [4, 7, 3]]
        cols = ""
        for col in order:
            imgs = "".join(f'<img src="../assets/lekalu/{n}.jpg" alt="">' for n in col * 2)   # twice, for a seamless loop
            cols += f'<div class="mq-col">{imgs}</div>'
        return f'<div class="bn-media"><div class="mq" aria-hidden="true">{cols}</div></div>'
    return '<div class="bn-media"><svg id="bn-wheel" class="bn-wheel" aria-hidden="true"></svg></div>'


def banner_controls(p):
    if p["media"]["kind"] != "video":
        return ""
    return """
    <div class="bn-ctrl">
      <button class="cbtn" id="bn-play" aria-label="Play or pause the film"><i class="led"></i>PAUSE</button>
      <button class="cbtn snd" id="bn-snd" aria-label="Turn sound on or off"><i class="led"></i>SOUND ON</button>
      <div class="seek" role="slider" aria-label="Seek"><i><b></b></i></div>
      <span class="tm" id="bn-time">00:00 / 00:00</span>
      <button class="cbtn" id="bn-full" aria-label="Full screen">FULLSCREEN</button>
    </div>"""


def detail_section(p):
    m = p["media"]
    if m["kind"] == "gallery":
        shots = "".join(
            f'<figure class="shot"><div class="frame"><img src="../assets/lekalu/{n}.jpg" alt="{esc(cap)}" loading="lazy"></div>'
            f'<figcaption><b>0{n}</b>{esc(cap)}</figcaption></figure>' for n, cap in m["items"])
        return f"""
  <section class="gal" id="film">
    <div class="gal-sticky">
      <div class="gal-head"><h2>See it in use</h2><span class="tag">[ SCROLL → ]</span></div>
      <div class="strip">{shots}</div>
      <div class="gal-bar"><i></i></div>
    </div>
  </section>"""
    if m["kind"] == "wheel":
        return """
  <section class="wheel-sec" id="film">
    <div class="wheel-sticky"><div class="wrap">
      <div class="wheel-copy">
        <span class="tag">[ THE WHEEL ]</span>
        <h2>Point at what it should become.</h2>
        <p>Select a file in Explorer and press the shortcut. A wheel of every format that file can turn into opens under your mouse. Type to search, click to convert.</p>
        <div class="convert"><span class="from">holiday.jpg</span><span class="arr">→</span><span class="to">holiday<span id="to">.png</span></span></div>
        <div class="keys"><kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> &nbsp;or right-click › Convert to…</div>
      </div>
      <svg id="wheel" role="img" aria-label="Illustration of the ShapeShifter format wheel"></svg>
    </div></div>
  </section>"""
    return ""


def page(i, p):
    prev, nxt = PROJECTS[(i - 1) % len(PROJECTS)], PROJECTS[(i + 1) % len(PROJECTS)]
    stats = "".join(f'<div class="stat" data-reveal style="--i:{k}"><b>{esc(a)}</b><span>{esc(b)}</span></div>' for k, (a, b) in enumerate(p["stats"]))
    cards = "".join(
        f'<article class="card" data-reveal style="--i:{k % 3}"><span class="n">0{k + 1}</span><h3>{esc(t)}</h3><p>{esc(d)}</p></article>'
        for k, (t, d) in enumerate(p["features"]))
    how = ""
    if p["steps"]:
        steps = "".join(
            f'<div class="step" data-reveal style="--i:{k}"><i></i><span class="mono">{esc(a)}</span><h3>{esc(b)}</h3><p>{esc(c)}</p></div>'
            for k, (a, b, c) in enumerate(p["steps"]))
        label, code = p["code"]
        how = f"""
  <section class="sec">
    <div class="wrap">
      <div class="sec-head" data-reveal><h2>{esc(p['how_title'])}</h2><span class="tag">[ HOW IT WORKS ]</span></div>
      <div class="steps">{steps}</div>
      <div class="code" data-reveal><div class="bar"><i></i> {label}</div><pre>{code}</pre></div>
    </div>
  </section>"""
    long_cls = " long" if len(p["name"]) > 9 else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(p['name'])} — Ethihas</title>
<meta name="description" content="{esc(p['tagline'])}">
<meta name="theme-color" content="{SCHEMES[p['slug']]['bn']}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../project.css">
<link rel="stylesheet" href="../transition.css">
<script>try{{var d=JSON.parse(sessionStorage.getItem('pt')||'null');if(d&&Date.now()-d.t<8000){{var r=document.documentElement;r.classList.add('pt-cover');r.style.setProperty('--pt-bg',d.bg)}}}}catch(e){{}}</script>
</head>
<body class="dark-top" style="{scheme_style(p['slug'])}">
<i class="fc tl"></i><i class="fc tr"></i><i class="fc bl"></i><i class="fc br"></i>
<div class="topbar">
  <a class="back" href="../index.html#work">← ETHIHAS</a>
  <span class="crumb">[ <b>{p['num']}</b> / 0{len(PROJECTS)} ] {esc(p['name'].upper())}</span>
  <span class="right"><span id="clock">00:00:00</span><span><i class="dot"></i> ONLINE</span></span>
</div>
<div class="ruler"><b></b></div>
<div class="pbar"><i></i></div>
<div class="bg"><div class="g1"></div><div class="g2"></div></div>

<main>
  <header class="banner">
    {banner_media(p)}
    <div class="bn-scrim"></div><div class="grain"></div>
    <div class="bn-content">
      <div class="wrap">
        <div class="kicker">[ PROJECT {p['num']} ] {esc(p['kicker'])}</div>
        <h1 class="title{long_cls}">{esc(p['name'])}</h1>
        <p class="tagline">{esc(p['tagline'])}</p>
        <div class="cta">
          {cta_buttons(p)}
          <a class="btn" href="#overview">Details ↓</a>
        </div>
      </div>
    </div>{banner_controls(p)}
  </header>

  <section class="sec" id="overview">
    <div class="wrap ov">
      <div data-reveal><dl class="readout">{meta_rows(p)}</dl></div>
      <div class="stats">{stats}</div>
    </div>
  </section>
{detail_section(p)}
  <section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="sec-head" data-reveal><h2>What it does</h2><span class="tag">[ FEATURES ]</span></div>
      <div class="grid">{cards}</div>
    </div>
  </section>
{how}
  <section class="final">
    <div class="wrap">
      <h2 data-reveal>{esc(p['final'])}</h2>
      <div class="cta" data-reveal>
        {cta_buttons(p)}
      </div>
    </div>
  </section>

  <nav class="pager">
    <a href="{prev['slug']}.html"><small>← PREVIOUS · {prev['num']}</small><b>{esc(prev['name'])}</b></a>
    <a href="{nxt['slug']}.html"><small>NEXT · {nxt['num']} →</small><b>{esc(nxt['name'])}</b></a>
  </nav>
  <footer><span>© <span id="yr"></span> ETHIHAS</span><a href="../index.html#work">ALL PROJECTS</a></footer>
</main>

<script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.36/dist/lenis.min.js"></script>
<script src="../transition.js"></script>
<script src="../project.js"></script>
<script>document.getElementById('yr').textContent = new Date().getFullYear();</script>
</body>
</html>
"""


for i, p in enumerate(PROJECTS):
    with open(os.path.join(OUT, p["slug"] + ".html"), "w", encoding="utf8") as f:
        f.write(page(i, p))
    print("wrote", p["slug"] + ".html")
