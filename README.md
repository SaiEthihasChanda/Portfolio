# Ethihas — portfolio

A static site (no build step): `index.html`, `projects/*.html`, `style.css`, `project.css`, `app.js`, `project.js`, `assets/`.

**Run locally:** `python tools/serve.py` then open http://localhost:8080 (this server supports video seeking).

**Edit the project pages:** change the data in `tools/build_projects.py`, then run `python tools/build_projects.py`.

**Photo cut-out:** `python tools/cutout.py photo.jpg assets/me_cutout.png`.

**Hosting:** GitHub Pages (Settings > Pages > Deploy from branch > `main` / root). The ShapeShifter installer is too large
for the repo, so it is attached to a GitHub Release as `ShapeShifter-Setup.exe`.
