# Logos on position cards

Every position card shows the position's **real logo or brand symbol** in its top-right corner (and, larger, on its
detail page), never an invented emblem:

- a company: its logo symbol (Anthropic's burst, Google's "G", …)
- a fund or ETF: the issuer's logo (Vanguard's ship, iShares, …)
- cash: the currency's symbol (the euro coin), a bond: the issuer's emblem, crypto: its symbol, and so on.

The logo is `public/brand/<id>.svg` (Anthropic and Alphabet are drawn in `components/sections/Investments.tsx`).
A card without a logo yet shows no artwork. Its brand name and glow colour come from `brand` and `accent` in
`data/holdings.json`.

## Claude adds the logo

When the daily IBKR update adds a new position, it starts `.github/workflows/card-art.yml`. Claude
(`anthropics/claude-code-action`) fetches the official logo (Wikimedia Commons or the company's own site; redrawn
faithfully as vector paths only if no official file exists), cleans it, and sets `brand`, `accent` (and `industry`
if missing) in `data/holdings.json`. The workflow then checks the file (a single SVG, no scripts, text, images or
external links, under 40 KB), publishes it and notifies you with an issue showing the logo.

To redo one: **Actions → Card artwork → Run workflow** with the position's id (as in `/investments/<id>`), its
name, ticker and your wishes (e.g. "use the white version", "symbol only").

## One-time setup

One repository secret (Settings → Secrets and variables → Actions → New repository secret):

- **`CLAUDE_CODE_OAUTH_TOKEN`**: uses your Claude Pro or Max subscription. On a computer with Claude Code, run
  `claude setup-token` and paste the token it prints; or
- **`ANTHROPIC_API_KEY`**: pay per use, from console.anthropic.com.

Without it, the Card artwork workflow fails and nothing else is affected: the card simply has no logo yet.

## Adding a logo by hand

Put the SVG at `public/brand/<id>.svg` (with a viewBox, transparent background, readable on a dark card) and commit
it to `cinematic-redesign`.
