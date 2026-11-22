# Personal investment portfolio: The Capital Universe

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
The site is a scroll-driven flight through one continuous 3D world. Each environment carries real portfolio data:

| Chapter | Environment | Real content |
|---|---|---|
| I · The Portal | Black-chrome iris over a mirror floor; the camera flies through it | Headline, portfolio value |
| II · The Capital Engine | Optical crystal core; white stream = deposits in, lime streams = capital out per holding (∝ allocation) | Invested capital, value, P/L, overview |
| III · The Investment District | One tower per holding (height from value), foot ring lime/coral by return, in a decorative city | Holdings, allocation; click a tower to open it |
| IV · The Observatory | Terrace under a lattice dome facing a ribbon of the real month-end index (rebased to 100) | Performance, journal |
| V · The Future | Horizon ring rising out of the mirror floor, monolith | Strategy, about, closing |

Code: `components/world/engine.ts` (Three.js world and camera path), `components/world/World.tsx` (scroll mapping, labels,
scene rail), `components/world/Chapter.tsx` (chapter cards). Scroll mapping: while chapter *i* scrolls into view,
the camera flies from scene *i−1* to *i*; while reading, it drifts. The scene rail (desktop) and the menu jump anywhere.
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
- An adaptive governor steps the resolution down and drops the mirror floor when a device can't hold ~30 fps.
- Phones and low-core devices get a lighter tier: no transmission or mirror floor, fewer buildings and particles,
  a lower pixel ratio and a wider lens.
- `prefers-reduced-motion`: no intro and no smooth scroll; the camera cuts between scenes instead of flying;
  idle animation stops.
- No WebGL: the full content renders over a static atmospheric background.
- The 3D receives percentages only, so the privacy settings still hold.
- Server-rendered text, semantic landmarks, keyboard-operable charts and tabs, and visible focus.
