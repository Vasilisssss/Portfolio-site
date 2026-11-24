# Daily IBKR data: one-time setup (about 10 minutes)

The site updates itself every weekday from an Interactive Brokers **Flex Query**: a free, read-only statement that
GitHub fetches with a token. No server, no login, no cost. The workflow is `.github/workflows/ibkr-daily.yml`, the
script `tools/ibkr/flex-update.mjs`.

IBKR renames menus from time to time; if a label below differs slightly, look for the closest match.

## 1. Create the Flex Query (IBKR Portal)

1. Log in to the IBKR Portal → **Performance & Reports** → **Flex Queries**.
2. Under **Activity Flex Query**, click **+** (Create).
3. **Query name:** `portfolio-site`.
4. Add these **sections**, each with the fields listed (ticking *Select All* is fine too):
   - **Open Positions**: Options **Summary**. Fields: Currency, FX Rate To Base, Asset Class, Symbol, Quantity,
     Mark Price, Cost Basis Price, Level of Detail, Report Date.
   - **Cash Report**: Options: tick **Currency Breakout** and **Base Currency Summary**. Fields: Currency, Ending Cash.
   - **Change in NAV**: Fields: From Date, To Date, Starting Value, Deposits & Withdrawals, Ending Value, **TWR**.
   - **Net Asset Value (NAV) in Base**: Fields: Report Date, Total.
5. **Delivery configuration**: Format **XML**, Period **Year to Date**.
6. **General configuration**: Date format **yyyyMMdd**; leave the rest as default.
7. **Save**. In the list of Flex Queries, note the **Query ID** (a number) next to `portfolio-site`.

## 2. Turn on the Flex Web Service (IBKR Portal)

1. Same page (**Performance & Reports → Flex Queries**), click the gear / **Flex Web Service Configuration**.
2. **Enable** it and **generate a token**. Choose the longest validity offered (up to 1 year) and put the expiry date
   in your calendar: the daily update stops (and the workflow fails visibly) when it expires.
3. Copy the **token**. Leave the IP restriction empty (GitHub's servers change address).

The token can only download statements for queries in your account. It cannot trade or move money.

## 3. Add both to GitHub (repository secrets)

1. github.com/Vasilisssss/Portfolio-site → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Name `IBKR_FLEX_TOKEN`, value: the token. Save.
3. **New repository secret** again: name `IBKR_FLEX_QUERY_ID`, value: the Query ID. Save.

Secrets are encrypted and never shown in logs or on the site.

## 4. First run

**Actions** → **Daily IBKR data** → **Run workflow** (branch `main`) → **Run workflow**. After a minute or two:

- **green**: the data was updated (or was already current) and the site redeploys a few minutes later;
- **red, with a new issue "needs review"**: the statement contained something to check (a trade, a deposit, a new
  position…). The issue says what. Once checked, run the workflow again with **accept changes** ticked. A new
  position also needs a line in `data/portfolio.json` with its name, asset class, geography and industry.

From then on it runs by itself Tuesday–Saturday at 06:17 UTC with the previous US trading day's closing figures.
If IBKR has not finished the statement yet, the next run picks it up.

## What it changes

Only `data/portfolio.json`: mark prices, quantities and average cost, the USD→EUR rate, cash, and the latest history
point (NAV, cumulative net deposits, cumulative time-weighted return from the statement's TWR, chained across years).
At the start of a month the previous month's last business day stays as that month's point.
