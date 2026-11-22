# Personal investment portfolio

A personal site showing **my own investments**: what I own, how my capital is allocated, how it has performed, and how I think about investing.

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger · Framer Motion · Lenis · Three.js

## Sections

01 Overview · 02 My investments (one page per holding) · 03 Asset allocation · 04 Performance · 05 Investment strategy · 06 Market journal · 07 About

## Where things live

| What | File |
|---|---|
| **What is public** — amounts, quantities, prices, dates, which holdings, which sections | `content/privacy.ts` |
| Your real holdings and history (**git-ignored, never committed**) | `data/portfolio.private.json` — format in `data/README.md` |
| Name, hero text, strategy, about, contact | `content/profile.ts` |
| Journal entries | `content/journal.ts` |
| Development sample data (used only when no private file exists) | `content/sample-portfolio.ts` |

## Privacy model

- Real data is read **only at build time on the server** (`lib/data.ts`, marked `server-only`).
- `lib/public.ts` applies `content/privacy.ts` and produces the only data shape that leaves the server.
  Hidden fields are removed before rendering, so they are not in the HTML, the JavaScript or the page data.
- A holding with `"public": false` gets no page. Its value counts in totals and allocation, shown as "Undisclosed".
- With `showAmounts: false` the site shows percentages and returns only. Charts switch to "growth of 100".
- Nothing is estimated: fields you don't provide are not shown, and performance needs real history.

Verified: building with `showAmounts: false` and one hidden holding leaves no currency amounts, quantities or hidden names
anywhere in `out/`.

## Data source

Holdings and history were read from Interactive Brokers (positions, cost basis, PortfolioAnalyst NAV and time-weighted returns).
When broker TWR is present (`twr` on history points), it is used as-is. Otherwise returns are computed with Modified Dietz,
so deposits never count as performance.

## Run / build / deploy

```bash
npm install
npm run dev            # http://localhost:3000
npm run build:pages    # static export for GitHub Pages → out/
```

Deploy by pushing the contents of `out/` to the `gh-pages` branch. Check `content/privacy.ts` first: whatever it allows becomes public.
