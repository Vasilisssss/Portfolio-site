# Investment portfolio site

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · GSAP + ScrollTrigger + SplitText · Framer Motion · Lenis · Three.js

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Edit content (no code changes needed)

| What | File |
|---|---|
| Firm name, email, address, nav, hero copy, closing line, disclaimer | `content/site.ts` |
| Philosophy principles, About text | `content/site.ts` |
| Holdings, allocation, returns, geography, sectors, globe cities | `content/portfolio.ts` |
| Articles | `content/insights.ts` |
| Performance history (currently a seeded sample series) | `lib/series.ts` → `buildSeries()` |

**All financial figures are illustrative sample data.** `portfolio.illustrative = true` shows the
"Illustrative sample data" badges across the site. Set it to `false` only once every figure is real and verified.
To use real history, return your daily NAV points from `buildSeries()` in the same `{ t, v, b }` shape.

## Structure

- `app/` — routes: home, `/portfolio/[slug]` and `/insights/[slug]` (statically generated), 404, error, loading, sitemap, robots
- `components/chrome/` — nav + full-screen menu, intro loader, cursor, grain, smooth scroll, NYSE clock
- `components/hero/` — hero and the WebGL globe (pauses off-screen, static under reduced motion)
- `components/portfolio/`, `components/analytics/`, `components/sections/` — page sections
- `components/ui/` — text reveals, magnetic button, sample badge, procedural card art

## Notes

- Every animation respects `prefers-reduced-motion`; the cursor only appears on fine pointers.
- The text is in the server-rendered HTML; animation only reveals it, so it stays crawlable.
- Number and date formatting is deterministic, so server and client output match and no hydration errors occur.
- Security headers are set in `next.config.ts`. No financial data leaves the build — it is static content.
- CMS-ready: the `content/*.ts` modules are typed and can be swapped for a headless CMS fetch (Sanity, Contentful, etc.) inside the same server components.
