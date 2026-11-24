# Logos on position cards

Every position card shows the position's **real logo or brand symbol** in its top-right corner (and, larger, on its
detail page), never an invented emblem:

- a company: its logo symbol (Anthropic's burst, Google's "G", …)
- a fund or ETF: the issuer's logo (Vanguard's red V, iShares, …)
- cash: the currency's symbol (the euro coin), a bond: the issuer's emblem, crypto: its symbol, and so on.

The logo is `public/brand/<id>.svg` (Anthropic and Alphabet are drawn in `components/sections/Investments.tsx`).
A card without a logo yet shows no artwork. Its brand name and glow colour come from `brand` and `accent` in
`data/holdings.json`.

## Claude adds the logo

A Claude scheduled task, **"Portfolio logos"** (on the owner's Claude account, Tuesday–Saturday 11:47 UTC, after
the morning IBKR update), looks at the live site for positions without a logo. For each, it fetches the company's
current official logo (Wikimedia Commons or the company's own site; a faithful redraw only if no official file
exists), checks the file (a single SVG, no scripts, text, images or external links, under 40 KB), sets `brand`,
`accent` (and `industry` if missing) in `data/holdings.json`, and publishes it. When every position has a logo it
stops straight away. No key is stored in GitHub.

To redo a logo: delete `public/brand/<id>.svg` (the next run adds it again), or ask Claude.

## Adding a logo by hand

Put the SVG at `public/brand/<id>.svg` (with a viewBox, transparent background, readable on a dark card) and commit
it to `cinematic-redesign`.
