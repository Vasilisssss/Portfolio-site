# Company artwork for position cards

Each stock or ETF card shows artwork in its top-right corner (and, larger, on its detail page):

1. **Company artwork**: `public/brand/<id>.svg`, an emblem related to the company (like the Anthropic burst or the
   Google "G"). Drawn by Claude through the **Card artwork** workflow, or added by hand.
2. **Fallback**: until there is one, a generated emblem (`components/ui/Emblem.tsx`), unique per ticker.

The card's brand name and glow colour come from `brand` and `accent` in `data/holdings.json`.

## How Claude draws it

When the daily IBKR update adds a new position, it starts `.github/workflows/card-art.yml` for it. Claude
(`anthropics/claude-code-action`) draws `public/brand/<id>.svg` inspired by the company's brand mark, colours and
products, sets `brand`, `accent` (and `industry` if empty) in `data/holdings.json`, and opens a **pull request**.
GitHub shows the SVG as an image in the pull request; **merge it to publish**, or close it and ask again with wishes.

To draw (or redraw) artwork for any position: **Actions → Card artwork → Run workflow**, with the position's id
(as in `/investments/<id>`), its name, ticker and optional wishes (e.g. "more minimal", "use the logo's colours").

## One-time setup

1. **A key for Claude**, as a repository secret (Settings → Secrets and variables → Actions → New repository secret):
   - **`CLAUDE_CODE_OAUTH_TOKEN`** (uses your Claude Pro or Max subscription): on a computer with Claude Code
     installed, run `claude setup-token` and paste the token it prints; or
   - **`ANTHROPIC_API_KEY`** (pay per use, from console.anthropic.com).
2. **Allow pull requests from workflows**: Settings → Actions → General → Workflow permissions → tick
   **Allow GitHub Actions to create and approve pull requests** → Save.

Without the key, the Card artwork workflow fails and nothing else is affected: the card keeps its generated emblem.

## Adding artwork by hand

Put an SVG at `public/brand/<id>.svg` (square, `viewBox="0 0 100 100"`, transparent background, made to read on a
dark card) and commit it to `cinematic-redesign`. Anthropic and Alphabet keep their hand-made artwork in
`components/sections/Investments.tsx`.
