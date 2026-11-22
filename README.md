# Personal investment portfolio

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
Live at **https://vasilisssss.github.io/Portfolio-site/**

Next.js 16 (App Router, **static export**) · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger · Framer Motion · Lenis · Three.js

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

- The 3D scene is procedural geometry with a generated environment: no model or texture downloads. Three.js
  loads lazily when the hero is visible and the browser is idle. Rendering pauses off-screen and in background tabs.
- Phones and low-core devices get a lighter tier: no glass transmission, fewer polygons, lower pixel ratio.
- `prefers-reduced-motion`: no intro, no smooth scroll, a static scene that only renders on input, and instant reveals.
- Server-rendered text, semantic landmarks, keyboard-operable charts and tabs, and visible focus.
