# Your real portfolio data

Put your real data in `data/portfolio.private.json`. The file is **git-ignored**, so it never reaches GitHub,
even though the repository is public. When the file exists, the site uses it instead of the sample data,
and the "Sample data" labels disappear.

Only what `content/privacy.ts` allows ends up in the built site. Check the output before you publish.

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
    { "date": "2024-01-31", "value": 100000, "netContributions": 95000 }
  ]
}
```

- `assetClass` must be one of the following: Stocks, ETFs, Cryptocurrency, Real Estate, Bonds, Cash, Precious Metals, Private Investments, Other Assets.
- Leave out any field you don't have. The site then doesn't show it, and nothing is ever estimated or made up.
- `history` lists month-end values with cumulative net deposits. It drives the performance section, which separates
  your returns from the money you put in. If you leave it empty, the performance section shows an empty state.
- `"public": false` keeps a holding off the site. Its value still counts towards totals and allocation, labelled "Undisclosed".
