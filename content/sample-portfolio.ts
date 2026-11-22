import type { Holding, HistoryPoint, PortfolioData } from "@/lib/types";
import { mulberry32 } from "@/lib/random";

/**
 * SAMPLE DATA FOR DEVELOPMENT ONLY — every name, ticker and number below is made up.
 * Your real data goes in data/portfolio.private.json (git-ignored, see data/README.md).
 */
const holdings: Holding[] = [
  { id: "example-technology", name: "Example Technology Co.", ticker: "EXTC", assetClass: "Stocks", quantity: 40, avgPrice: 142.5, currentPrice: 198.2, currency: "USD", purchaseDate: "2021-03-15", geography: "North America", industry: "Technology", note: "Sample note — why I hold this position." },
  { id: "example-health", name: "Example Health plc", ticker: "EXHL", assetClass: "Stocks", quantity: 120, avgPrice: 38.1, currentPrice: 44.6, currency: "EUR", purchaseDate: "2022-06-02", geography: "Europe", industry: "Healthcare" },
  { id: "sample-world-equity", name: "Sample World Equity ETF", ticker: "SWEQ", assetClass: "ETFs", quantity: 260, avgPrice: 78.4, currentPrice: 101.9, currency: "USD", purchaseDate: "2020-11-10", geography: "Global", industry: "Diversified", note: "Sample note — the core of the portfolio." },
  { id: "sample-emerging-markets", name: "Sample Emerging Markets ETF", ticker: "SEMK", assetClass: "ETFs", quantity: 300, avgPrice: 41.2, currentPrice: 43.0, currency: "USD", purchaseDate: "2021-08-19", geography: "Emerging Markets", industry: "Diversified" },
  { id: "sample-crypto", name: "Sample Crypto Asset", ticker: "SCA", assetClass: "Cryptocurrency", quantity: 0.8, unit: "units", avgPrice: 9800, currentPrice: 14200, currency: "USD", purchaseDate: "2022-11-28", geography: "Global", industry: "Digital assets" },
  { id: "sample-apartment", name: "Sample Apartment", assetClass: "Real Estate", invested: 60000, currentValue: 71500, currency: "EUR", purchaseDate: "2019-05-20", geography: "Europe", industry: "Residential property" },
  { id: "sample-treasury-2029", name: "Sample Treasury Bond 2029", ticker: "ST29", assetClass: "Bonds", quantity: 25, avgPrice: 970, currentPrice: 1004, currency: "USD", purchaseDate: "2023-04-12", geography: "North America", industry: "Government bonds" },
  { id: "cash-reserve", name: "Cash reserve", assetClass: "Cash", invested: 15000, currentValue: 15000, currency: "EUR", geography: "Europe", industry: "Cash" },
  { id: "sample-gold", name: "Sample Gold Holding", ticker: "SGLD", assetClass: "Precious Metals", quantity: 6, unit: "oz", avgPrice: 1780, currentPrice: 2310, currency: "USD", purchaseDate: "2020-08-03", geography: "Global", industry: "Precious metals" },
  { id: "sample-private-stake", name: "Sample Private Company Stake", assetClass: "Private Investments", invested: 12000, currentValue: 15600, currency: "EUR", purchaseDate: "2022-09-30", geography: "Europe", industry: "Software" },
  // Example of a position kept off the public site: still counted in totals, shown only as "Undisclosed".
  { id: "sample-undisclosed", name: "Sample Hidden Position", assetClass: "Stocks", quantity: 50, avgPrice: 60, currentPrice: 72, currency: "USD", purchaseDate: "2023-02-14", geography: "North America", industry: "Financials", public: false },
];

const fx: Record<string, number> = { USD: 1, EUR: 1.08 };

const valueOf = (h: Holding) => (h.currentValue ?? (h.quantity ?? 0) * (h.currentPrice ?? 0)) * (fx[h.currency] ?? 1);
const costOf = (h: Holding) => (h.invested ?? (h.quantity ?? 0) * (h.avgPrice ?? 0)) * (fx[h.currency] ?? 1);

/** Generated month-end history that ends exactly at today's sample totals. */
function sampleHistory(): HistoryPoint[] {
  const rnd = mulberry32(2026);
  const endValue = holdings.reduce((s, h) => s + valueOf(h), 0);
  const endContrib = holdings.reduce((s, h) => s + costOf(h), 0);
  const months: string[] = [];
  const d = new Date(Date.UTC(2019, 4, 31));
  const end = Date.UTC(2026, 9, 31);
  while (d.getTime() <= end) {
    months.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  }
  // contributions: an initial lump, then irregular monthly deposits and one withdrawal
  const flows = months.map((_, i) => (i === 0 ? 0.3 : 0.007 + rnd() * 0.012) * (i === 40 ? -1.4 : 1));
  const flowSum = flows.reduce((a, b) => a + b, 0);
  let contrib = 0, value = 0;
  const raw = months.map((date, i) => {
    const flow = (flows[i] / flowSum) * endContrib;
    contrib += flow;
    const r = 0.0055 + (rnd() - 0.5) * 0.06;
    value = (value + flow) * (1 + r);
    return { date, value, netContributions: contrib };
  });
  // rescale growth so the last point matches the current total exactly
  const last = raw[raw.length - 1];
  const k = Math.log(endValue / last.netContributions) / Math.log(last.value / last.netContributions);
  return raw.map((p) => ({ ...p, value: p.netContributions * Math.pow(Math.max(p.value / p.netContributions, 0.01), k) }));
}

export const samplePortfolio: PortfolioData = {
  sample: true,
  baseCurrency: "USD",
  fx,
  asOf: "2026-10-31",
  holdings,
  history: sampleHistory(),
};
