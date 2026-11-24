# Portfolio data

`data/portfolio.json` is the portfolio the site shows. It is committed, so it is **public** like the repository.
Merge a change into `cinematic-redesign` and the site redeploys. It is updated daily from Interactive Brokers by
`.github/workflows/ibkr-daily.yml` (setup: `docs/ibkr-flex-setup.md`).

To keep the raw data private, either put it in `data/portfolio.private.json` (git-ignored, local builds) or in the
`PORTFOLIO_JSON` repository secret (CI, once the release workflow passes it to the build). Both override `portfolio.json`. Only what `content/privacy.ts` allows
reaches the built site. With no data file at all, the clearly-labelled sample in `content/sample-portfolio.ts` is used.

## Format

```json
{
  "baseCurrency": "USD",
  "fx": { "USD": 1, "EUR": 1.08 },
  "asOf": "2026-11-21",
  "holdings": [
    {
      "id": "my-world-etf",
      "name": "…",
      "ticker": "…",
      "assetClass": "ETFs",
      "quantity": 100,
      "avgPrice": 80.0,
      "currentPrice": 95.5,
      "currency": "USD",
      "purchaseDate": "2021-03-01",
      "geography": "Global",
      "industry": "Diversified",
      "note": "Why I hold it",
      "public": true
    },
    {
      "id": "my-flat",
      "name": "Apartment",
      "assetClass": "Real Estate",
      "invested": 150000,
      "currentValue": 172000,
      "currency": "EUR"
    }
  ],
  "history": [
    { "date": "2024-01-31", "value": 100000, "netContributions": 95000, "twr": 0.052 }
  ]
}
```

- `assetClass` must be one of the following: Stocks, ETFs, Cryptocurrency, Real Estate, Bonds, Cash, Precious Metals, Private Investments, Other Assets.
- Leave out any field you don't have. The site then doesn't show it, and nothing is ever estimated or made up.
- `history` lists month-end values with cumulative net deposits. `twr` (optional) is the broker's cumulative time-weighted return; when every point has it, it is used as-is. If the last point's date equals `asOf`, its value is replaced by the live total, so charts and totals agree. It drives the performance section, which separates
  your returns from the money you put in. If you leave it empty, the performance section shows an empty state.
- `"public": false` keeps a holding off the site. Its value still counts towards totals and allocation, labelled "Undisclosed".
