# Play Store assets

Generated, not drawn: `node render.mjs` renders `feature-graphic.html` (1024×500) and
`screenshots.html` (1080×1920, 8 slides) in Czech and English into `out/`, through the local
Chrome. Needs network once for the Geist font.

- `screens/` – the phone captures (1280×2772) the slides show, plus `08-closing.jpg` for the last slide; swap a file and re-render.
- The copy lives in `SLIDES` in `screenshots.html`; the tagline in `feature-graphic.html`.
- The icon is `../logo/Android/bikecheck_launcher_icon/play_store_512.png`.
