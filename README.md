# Personal investment portfolio: Inside the Investment Headquarters

My own investments: what I own, how my capital is allocated, how it has performed, and how I think about investing.
A scroll-driven journey: scrolling walks you up to a headquarters at blue hour, through its doors, onto the trading
floor and on through four photographic rooms. Every section on the page moves with the scroll.

| Chapter | Where | Real content |
|---|---|---|
| I · Headquarters | The walk: plaza → portal → doors → trading floor (scroll is the playhead, both ways) | Headline, portfolio value |
| II · The Capital Engine | Market screens reflected in dark glass | Invested capital, value, P/L, overview |
| III · The Investment Gallery | Steel monoliths on a black stone plinth | Holdings, allocation |
| IV · The Performance Gallery | A line of light on a walnut wall | Performance |
| V · The Final Reveal | The skyline above the clouds, then **The Window** — the whole journey replayed through one frame | Strategy, experience, about |

How it is made:
- `tools/media/frames.mjs` — turns the two approved source clips (`media-src/headquarters-*.mp4`, kept out of the published site) into one continuous,
  scroll-scrubbed walk: finds the join where the portal is framed most alike (centre-weighted luma + edge
  correlation over the last 3 s / first 5 s, reframing only the establishing side so any zoom reads as a forward
  push), cross-dissolves 8 frames, grades every frame like `public/scenes` and writes WebP at full resolution and
  854×480, plus `public/media/journey/manifest.json` (frames, join, the frame where the doors are passed).
  Run `node tools/media/frames.mjs` (ffmpeg with libwebp on PATH); `--analyse` prints the join only.
- `public/scenes/` — the four rooms and the closing shot, each wide/tall at two sizes; `manifest.json` gives each
  room's fly-in point (`zoomOrigin`) and subject position for portrait crops (`focusX`).
- `components/journey/` — one fixed WebGL2 stage behind the page (`stage.ts`: cover-fit, push, radial blur, aperture,
  grade, vignette, grain; Canvas2D fallback), the frame loader (`sequence.ts`), the conductor that maps scroll to the
  walk and the rooms (`Journey.tsx`), the chapter cards (`Chapter.tsx`) and **The Window** (`ViewingWindow.tsx`).
- `components/motion/` — the shared motion system (masked headlines with drift and velocity skew, fade-rise,
  clip reveals, assembling grids, stacked sheets, drifting type, text-roll links) on GSAP + ScrollTrigger + Lenis.
- `?qa` exposes deterministic test hooks (`window.__journey`).

Live at **https://vasilisssss.github.io/Portfolio-site/**

Next.js 16 (App Router, **static export**) · TypeScript · Tailwind CSS 4 · WebGL2 · GSAP + ScrollTrigger + SplitText · Framer Motion · Lenis · Geist / Geist Mono / Instrument Serif

## Sections

01 Overview · 02 My investments (one page per holding) · 03 Asset allocation · 04 Performance · Investment strategy · Experience · About

## Where things live

| What | File |
|---|---|
| Portfolio data (holdings, FX, month-end history) | `data/portfolio.json` (committed and **public**) |
| What the site reveals (amounts, quantities, prices, dates, holdings, sections) | `content/privacy.ts` |
| **All financial calculations, the single source of truth** | `lib/portfolio.ts` |
| Privacy filter (the only data that reaches the browser) | `lib/public.ts` |
| Name, hero text, strategy, about, contact | `content/profile.ts` |

## How figures are defined (`lib/portfolio.ts`)

- **Total portfolio value**: the sum of every position at current price × FX.
- **Invested capital**: net deposits (deposits − withdrawals) from the history; cost basis is used only when there is no history.
- **Profit / loss**: total value − invested capital. It splits into *open positions* (Σ value − cost basis) and *fees, FX & cash*.
- **Total return**: profit / loss ÷ invested capital.
- **Time-weighted return**: from the broker (`twr` on history points); otherwise Modified Dietz. Deposits never count as performance.
- The last history point is valued exactly like the headline total, so every chart ends on the same number.

Every section reads these values. Nothing is estimated, and fields that aren't in the data are not shown.

## Updating the data

Replace `data/portfolio.json` (format in `data/README.md`) and merge it into `cinematic-redesign`. The site redeploys automatically.
The current data comes from Interactive Brokers: positions and cost basis, plus PortfolioAnalyst month-end NAV and TWR.

**Keeping data out of the public repo (optional):** store the JSON in a repository secret named `PORTFOLIO_JSON`.
A build that is given it uses it instead of `data/portfolio.json` (the release workflow would need to pass it to `npm run build:pages`). For local builds, `data/portfolio.private.json` does the same
(it is git-ignored).

## Deployment: GitHub Pages

The live site is built from the **`cinematic-redesign`** branch. `.github/workflows/cinematic-redesign-checks.yml` runs on
every push to it (and on manual dispatch): `npm ci`, typecheck, `npm run build:pages` (static export under `/Portfolio-site`),
then publishes `out/` to the `gh-pages` branch. Changes arrive as pull requests into `cinematic-redesign`.
Pages serves that branch (Settings › Pages › Deploy from a branch › `gh-pages` / root). No server is involved.

```bash
npm install
npm run dev            # http://localhost:3000
npm run build:pages    # the exact build CI runs → out/
```

## Performance and accessibility

- The walk is a sequence of small WebP frames (full size on desktop, 854×480 on phones and Save-Data), fetched
  nearest-the-playhead first; only a window of frames around the playhead is decoded. The opening curtain stays up
  until the first stretch of the walk is fetched, decoded and drawn (at least 1.6 s, at most 5 s), so the first
  scroll never waits on the network.
- The stage redraws only when something changes, caps its pixel density (≤ 2×, ≤ 4.5 MP) and hides itself where no
  chapter window is on screen. The poster is server-rendered as the first frame.
- `prefers-reduced-motion`: no curtain, no smooth scrolling, no scrubbing; the hero shows its still poster.
- No WebGL2: the same stage runs on Canvas2D.
- The stage receives images only; figures come from the privacy-filtered view, so the privacy settings still hold.
- Server-rendered text, semantic landmarks, keyboard-operable charts and tabs, and visible focus.
