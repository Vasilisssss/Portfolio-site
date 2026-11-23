# Personal investment portfolio: The World Inside a Briefcase

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
A brushed-aluminium briefcase opens in a dark photographic studio; inside it lies a 1 : 110 model of a trading hall.
The camera descends into the model and arrives at eye level in the full-scale hall, walks to the gallery and the
performance wall, then rises back out into the open case. Everything you see is a path-traced film (Blender Cycles),
scrubbed by scrolling.

| Chapter | Where | Real content |
|---|---|---|
| I · The Reveal | The closed case on a basalt pedestal; the lid opens on the hall inside | Headline, portfolio value |
| II · The Capital Engine | The trading floor: the video wall, ticker and every desk monitor show the real figures | Invested capital, value, P/L, overview |
| III · The Investment Gallery | Gallery wing: one brushed-steel monolith per holding, **height ∝ share of capital**, a lime/coral band (above/below cost), a brass plaque | Holdings, allocation |
| IV · The Performance Gallery | On the walnut wall: the **real month-end index** as a steel line, rebased to 100; each month's ring lime (gain) or coral (loss) | Performance, journal |
| V · The Final Reveal | Up through the open roof and back out to the whole open case | Strategy, about, closing |

How it is made:
- `tools/film/world.py` — the hall, gallery, performance wall, studio, briefcase and the 1 : 110 miniature, modelled by
  script in Blender with scanned materials and models; `render.py` — one camera path over scroll progress u ∈ [0, 4],
  five full-resolution stills (one per scene) and ~160 motion frames, with the screen position of every label anchor
  per frame; `encode.py` — photographic grade, WebP at two sizes, `public/film/manifest.json`.
- Screens are drawn from the site's own privacy-filtered export (`/film-data.json`, built from `lib/public.ts`) by
  `screens_img.py`, so the film can only show what the page may show.
- `tools/film/check.mjs` runs in `npm run build:pages` and **stops the build if the portfolio data changed since the
  film was rendered** — the film must be re-rendered rather than publish stale figures.
- `components/world/film.ts` — the player: loads the scene stills first, then motion frames nearest the playhead,
  cross-fades frame to frame, keeps a small window decoded, and positions the HTML labels on the rendered objects.
- `tools/exchange/proto.py` — the approved one-room prototype the film grew from.
- Render: Blender as a Python module (`pip install bpy pillow`), Cycles on CPU, OpenImageDenoise.
  `python tools/film/world.py --out world.blend` → `python tools/film/render.py world.blend out keys 1920 192` and
  `… seq 1280 32 0 157` → `python tools/film/encode.py out film-data.json public/film`.
- `?qa` exposes deterministic test hooks.

Credits: CC0 scans from [Poly Haven](https://polyhaven.com). Materials: Granite Tile and Granite Tile 03 (Charlotte Baglioni),
Marble 01 and Fabric Leather 01 (Rob Tuytel), Smoked Walnut, Black Oak and White Oak Veneer (Jenelle van Heerden),
Poly Wool Herringbone (colormass, Rico Cilliers). Models: Pachira Aquatica 01 and Calathea Orbifolia 01 (Rob Tuytel,
Rico Cilliers), Potted Plant 01 and 02 (Rico Cilliers), Potted Plant 04 and Side Table 01 (James Ray Cock), Mid Century
Lounge Chair (Kuutti Siitonen), Modern Coffee Table 01 (Amin), Wall Clock (PierreB3D). Panorama: Canary Wharf (Andreas Mischok).
Details: `tools/film/CREDITS.json`.

Live at **https://vasilisssss.github.io/Portfolio-site/**

Next.js 16 (App Router, **static export**) · TypeScript · Tailwind CSS 4 · Blender Cycles (pre-rendered film) · GSAP + ScrollTrigger · Framer Motion · Lenis · Geist / Geist Mono / Instrument Serif

## Sections

01 Overview · 02 My investments (one page per holding) · 03 Asset allocation · 04 Performance · 05 Investment strategy · 06 Market journal · 07 About

## Where things live

| What | File |
|---|---|
| Portfolio data (holdings, FX, month-end history) | `data/portfolio.json` (committed and **public**) |
| What the site reveals (amounts, quantities, prices, dates, holdings, sections) | `content/privacy.ts` |
| **All financial calculations, the single source of truth** | `lib/portfolio.ts` |
| Privacy filter (the only data that reaches the browser) | `lib/public.ts` |
| Name, hero text, strategy, about, contact | `content/profile.ts` |
| Journal entries | `content/journal.ts` |

## How figures are defined (`lib/portfolio.ts`)

- **Total portfolio value**: the sum of every position at current price × FX.
- **Invested capital**: net deposits (deposits − withdrawals) from the history; cost basis is used only when there is no history.
- **Profit / loss**: total value − invested capital. It splits into *open positions* (Σ value − cost basis) and *fees, FX & cash*.
- **Total return**: profit / loss ÷ invested capital.
- **Time-weighted return**: from the broker (`twr` on history points); otherwise Modified Dietz. Deposits never count as performance.
- The last history point is valued exactly like the headline total, so every chart ends on the same number.

Every section reads these values. Nothing is estimated, and fields that aren't in the data are not shown.

## Updating the data

Replace `data/portfolio.json` (format in `data/README.md`) and push to `main`. The site redeploys automatically.
The current data comes from Interactive Brokers: positions and cost basis, plus PortfolioAnalyst month-end NAV and TWR.

**Keeping data out of the public repo (optional):** store the JSON in a repository secret named `PORTFOLIO_JSON`.
The deploy workflow then uses it instead of `data/portfolio.json`. For local builds, `data/portfolio.private.json` does the same
(it is git-ignored).

## Deployment: GitHub Pages

`.github/workflows/deploy-pages.yml` runs on every push to `main` and on manual dispatch. It runs `npm ci`, then
`npm run build:pages` (static export under `/Portfolio-site`), checks the output, and publishes `out/` to the `gh-pages` branch.
Pages serves that branch (Settings › Pages › Deploy from a branch › `gh-pages` / root). No server is involved.

```bash
npm install
npm run dev            # http://localhost:3000
npm run build:pages    # the exact build CI runs → out/
```

## Performance and accessibility

- All 3D is procedural geometry plus a GPU-generated studio environment: no model, texture or HDR downloads.
  Three.js (and the world) load only after the page has loaded and gone idle. Shaders compile asynchronously
  (`compileAsync`). Rendering pauses in background tabs, and only the environments near the camera are drawn.
- **Native resolution on every device**: the 3D renders at the screen's own pixel density (1× standard screens,
  2× Retina / 4K / 5K, up to 3× phones), and adopts the new density when the window moves to another screen.
- Adaptive quality (`components/world/quality.ts`): when a device can't hold ~42 fps, effects make way first
  (ambient occlusion → depth of field → lighter anti-aliasing and bloom → softer shadow map); resolution only steps down
  after that, and never below 1× or 75% of native. Effects come back once the device runs smoothly again.
- Add `?quality` to the address to see what your device actually renders (size, density, fps, quality level).
- Phones and low-core devices get a lighter tier: no ambient occlusion, depth of field or glass refraction, 2K shadow map,
  512 px surface maps, fewer bevel segments; the lens widens so the framing holds on narrow screens.
- `prefers-reduced-motion`: no intro and no smooth scroll; the camera cuts between scenes instead of flying;
  idle animation stops.
- No WebGL: the full content renders over a static atmospheric background.
- The 3D receives percentages only, so the privacy settings still hold.
- Server-rendered text, semantic landmarks, keyboard-operable charts and tabs, and visible focus.
