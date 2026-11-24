# Headquarters media

## Sources

- `public/media/headquarters-establishing.mp4` — blue-hour approach across the plaza to the bronze-lined portal (1280×720, 24 fps, 7.9 s).
- `public/media/headquarters-arrival.mp4` — closer approach; the camera passes through the portal onto the trading floor (1280×720, 24 fps, 7.9 s).
- `public/scenes/` — the four rooms (screens, gallery, chart, skyline) and the closing shot (metal), each as
  `<id>-wide.webp` 1920×1080, `-wide-sm` 1280×720, `-tall` 1080×1350, `-tall-sm` 720×900, with `manifest.json`.

The MP4s are not loaded by the page; they are the sources of the walk frames. The original poster JPGs remain as
approved references.

## The walk

`node tools/media/frames.mjs` builds `public/media/journey/`:

- Join: establishing frame 175 (7.29 s) ↔ arrival frame 104 (4.33 s); the establishing side is pushed in ×1.05 and
  re-centred by −2 % over the second before the join, then an 8-frame cross-dissolve.
- 261 source frames → every 2nd frame kept: 131 frames, 12 fps of scroll playback.
- `hi/` 1280×720 WebP q80 — 9.0 MB; `lo/` 854×480 q64 — 4.1 MB (phones ≤ 820 px and Save-Data).
- Doors passed at frame 120 (caption switches to "Entering", warm bloom).

If the clips are replaced with higher-resolution versions, re-run the script: it exports at the source's resolution.

## Release boundary

Work happens on feature branches with a pull request into `cinematic-redesign`. A push to `cinematic-redesign`
publishes the site (GitHub Actions); `main` has its own deploy workflow. Neither is pushed to directly.
