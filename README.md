# Personal investment portfolio: The World Inside a Briefcase

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
The site is a scroll-driven product film: a real-scale (46 × 34 cm) luxury attaché case in a dark photographic studio
opens, and the miniature architectural model inside it is built from my real portfolio data.

| Chapter | What you see | Real content |
|---|---|---|
| I · The Reveal | The closed case; locks release (slider → spring flap → lamp), the lid lifts to its 100° hinge stop, the model platform rises and the towers telescope up | Headline, portfolio value |
| II · The Capital Engine | A turned reservoir of steel bearings feeding a distribution ring. **Each holding's arc is exactly its weight**; its bearings roll out on its own rail channel; a thin anodised inlay is lime (above cost), coral (below) or steel (unknown/flat) | Invested capital, value, P/L, overview |
| III · The Investment City | A treemap of plots: **plot area ∝ weight**, building height ∝ √weight, building type by asset class (tower / pavilion / colonnade / cash vault), performance band around each plot | Holdings, allocation; select a building to open it |
| IV · The Performance Gallery | Inside the lid: a polished steel line on standoff pins traces the **real month-end index (rebased to 100)**; month caps lime/coral; missing months break the line (nothing is interpolated) | Performance, journal |
| V · The Final Reveal | The whole open case in the studio | Strategy, about, closing |

Code: `components/world/engine.ts` (renderer, studio, post-processing, camera, labels, picking, QA hooks),
`components/world/briefcase/` (`case.ts` the briefcase, `world.ts` the data-driven model, `mechanics.ts` spring physics,
`camera.ts` keyframes, `materials.ts` + `textures.ts` PBR materials with GPU-baked leather/brushed/scratch/fingerprint maps,
`dims.ts` real dimensions), `components/world/treemap.ts`, `components/world/quality.ts` (adaptive quality).
Everything is procedural: no model, texture or HDR downloads. The 3D receives percentages only.
Add `?quality` to the address to see what your device renders; `?qa` exposes deterministic test hooks.
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
