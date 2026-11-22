/**
 * ILLUSTRATIVE SAMPLE DATA — replace with verified figures before publishing.
 * `illustrative: true` drives the "Sample data" labels across the site;
 * set it to false only once every number below is real and verified.
 */
export type ArtKind = "eq" | "pe" | "re" | "vc" | "alt" | "sh" | "fi";

export interface Investment {
  slug: string;
  category: string;
  name: string;
  thesis: string;
  /** percent of total portfolio, should sum to 100 */
  allocation: number;
  /** total return since entry as a decimal, e.g. 0.25 = +25% */
  returnSinceEntry: number;
  horizon: string;
  entryYear: string;
  art: ArtKind;
  layout: { span: 4 | 5 | 7; offset: number; minHeight: number };
}

export const portfolio = {
  illustrative: true,
  totalValue: 12_400_000,
  asOf: "2026-11-20",
  investments: [
    { slug: "global-quality-compounders", category: "Public Equities", name: "Global Quality Compounders", allocation: 30, returnSinceEntry: 0.684, horizon: "7–10 yrs", entryYear: "2020", art: "eq", layout: { span: 7, offset: 0, minHeight: 640 },
      thesis: "A concentrated basket of durable, cash-generative businesses with pricing power and reinvestment runway — owned through cycles, not traded around them." },
    { slug: "mid-market-buyout-programme", category: "Private Equity", name: "Mid-Market Buyout Programme", allocation: 14, returnSinceEntry: 0.412, horizon: "8–12 yrs", entryYear: "2021", art: "pe", layout: { span: 5, offset: 120, minHeight: 520 },
      thesis: "Commitments alongside operator-led sponsors buying essential-service businesses in fragmented markets, where professionalisation creates value." },
    { slug: "european-residential-assets", category: "Real Estate", name: "European Residential Assets", allocation: 16, returnSinceEntry: 0.227, horizon: "10+ yrs", entryYear: "2019", art: "re", layout: { span: 5, offset: 0, minHeight: 560 },
      thesis: "Well-located residential buildings in supply-constrained cities, acquired below replacement cost and held for income and inflation protection." },
    { slug: "seed-series-a-programme", category: "Venture Capital", name: "Seed & Series A Programme", allocation: 7, returnSinceEntry: 0.315, horizon: "10–12 yrs", entryYear: "2022", art: "vc", layout: { span: 7, offset: -80, minHeight: 620 },
      thesis: "Small early cheques into technical founders building in large markets. Sized so that any single loss is tolerable and any single win is meaningful." },
    { slug: "real-assets-gold-sleeve", category: "Alternative Investments", name: "Real Assets & Gold Sleeve", allocation: 9, returnSinceEntry: 0.189, horizon: "Permanent", entryYear: "2020", art: "alt", layout: { span: 4, offset: 0, minHeight: 500 },
      thesis: "Uncorrelated stores of value that protect purchasing power when financial assets struggle together." },
    { slug: "founder-partnership-stakes", category: "Strategic Holdings", name: "Founder & Partnership Stakes", allocation: 8, returnSinceEntry: 0.54, horizon: "Indefinite", entryYear: "2021", art: "sh", layout: { span: 4, offset: 64, minHeight: 500 },
      thesis: "Minority positions alongside trusted partners, where we contribute patient judgement as well as capital." },
    { slug: "short-duration-treasury-ladder", category: "Cash & Fixed Income", name: "Short-Duration Treasury Ladder", allocation: 16, returnSinceEntry: 0.098, horizon: "0–3 yrs", entryYear: "2023", art: "fi", layout: { span: 4, offset: 0, minHeight: 500 },
      thesis: "Liquidity as an option: a laddered book of high-quality short bonds, earning a real yield while we wait to deploy." },
  ] satisfies Investment[] as Investment[],
  geography: [
    { name: "North America", pct: 41 },
    { name: "Europe", pct: 29 },
    { name: "Asia-Pacific", pct: 18 },
    { name: "Latin America", pct: 7 },
    { name: "Middle East & Africa", pct: 5 },
  ],
  sectors: [
    { name: "Technology", pct: 21 },
    { name: "Real estate", pct: 17 },
    { name: "Cash & bonds", pct: 14 },
    { name: "Financials", pct: 13 },
    { name: "Industrials", pct: 11 },
    { name: "Healthcare", pct: 10 },
    { name: "Consumer", pct: 8 },
    { name: "Energy & materials", pct: 6 },
  ],
  /** offices / exposure nodes drawn on the hero globe */
  nodes: [
    { name: "New York", lat: 40.7, lon: -74 },
    { name: "London", lat: 51.5, lon: -0.1 },
    { name: "Zurich", lat: 47.4, lon: 8.5 },
    { name: "Dubai", lat: 25.2, lon: 55.3 },
    { name: "Singapore", lat: 1.3, lon: 103.8 },
    { name: "Tokyo", lat: 35.7, lon: 139.7 },
    { name: "Sydney", lat: -33.9, lon: 151.2 },
    { name: "São Paulo", lat: -23.5, lon: -46.6 },
  ],
};

export const getInvestment = (slug: string) => portfolio.investments.find((i) => i.slug === slug);
export const valueOf = (inv: Investment) => (portfolio.totalValue * inv.allocation) / 100;
export const initialOf = (inv: Investment) => valueOf(inv) / (1 + inv.returnSinceEntry);
