# Personal investment portfolio: The World Inside a Briefcase

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
A real-scale (46 × 34 cm) luxury attaché opens in a dark photographic studio; inside it stands a model of a stock
exchange. The camera descends through the model's skylight and you walk through the exchange at full human scale —
then leave through its glass façade and pull back to find it was inside the briefcase all along.

| Chapter | Where | Real content |
|---|---|---|
| I · The Reveal | The case in the studio: locks release (slider → spring flap → lamp), lid lifts to its 100° stop, the 1 : 320 exchange rises out of it | Headline, portfolio value |
| II · The Capital Engine | The 48 m trading hall: a ring whose arcs are **exactly each holding's weight**, steel spheres rolling out on rail channels, lime/coral inlays (above/below cost); the main board shows the real figures | Invested capital, value, P/L, overview |
| III · The Investment Gallery | West wing: one plinth per holding, steel column ∝ √weight, performance band, data plaque | Holdings, allocation; select a plinth to open it |
| IV · The Performance Gallery | Upstairs (via the grand stair): the **real month-end index** as a steel line on the stone wall; missing months break the line | Performance, journal |
| V · The Final Reveal | Out through the façade glass and back to the whole open case | Strategy, about, closing |

How it is made:
- `tools/exchange/` — the building is modelled by script in Blender (`build.py`), its light path-traced in Cycles and
  baked into a 4K lightmap (`bake.py`: hidden-face culling, one atlas, Intel Open Image Denoise lightmap filter,
  reflection panoramas) and exported for the web (`export.py`). Run with Blender's Python (`pip install bpy pyoidn pillow`).
- `public/exchange/` — the result: 1.5 MB meshopt geometry, the lightmap, scanned materials, panoramas, city backdrop (~13 MB, loaded after the page).
- `components/world/exchange/` — loader, lightmap/specular-occlusion shader patch, planar floor reflections, live data
  screens, full-scale installations, the walking route (gait, eased stops, stairs).
- `components/world/engine.ts` — scene A (studio + case + miniature) and scene B (full-scale exchange) share geometry and
  baked light; the descent and the exit switch scenes at the glass. `components/world/briefcase/` — the case and its mechanics.
- Add `?quality` to the address to see what your device renders; `?qa` exposes deterministic test hooks.

Credits: materials and the Canary Wharf panorama are CC0 scans from [Poly Haven](https://polyhaven.com) — Granite Tile
(Charlotte Baglioni), Marble 01 and Fabric Leather 01 (Rob Tuytel), Brushed Concrete (Dimitrios Savva, Dario Barresi),
Flamed Black and Smoked Walnut Veneer (Jenelle van Heerden), Canary Wharf HDRI (Andreas Mischok).

Live at **https://vasilisssss.github.io/Portfolio-site/**

Next.js 16 (App Router, **static export**) · TypeScript · Tailwind CSS 4 · Three.js · GSAP + ScrollTrigger · Framer Motion · Lenis · Geist / Geist Mono / Instrument Serif

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
