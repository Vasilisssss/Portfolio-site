/** Raw portfolio data (server-only). Optional fields are simply not shown when absent. */

export const ASSET_CLASSES = [
  "Stocks", "ETFs", "Cryptocurrency", "Real Estate", "Bonds", "Cash", "Precious Metals", "Private Investments", "Other Assets",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export interface Holding {
  /** url-safe id, used in /investments/<id> */
  id: string;
  name: string;
  assetClass: AssetClass;
  ticker?: string;
  quantity?: number;
  unit?: string;
  /** per unit, in the holding's currency */
  avgPrice?: number;
  currentPrice?: number;
  /** total cost, in the holding's currency. Derived from quantity × avgPrice when omitted. */
  invested?: number;
  /** current value, in the holding's currency. Derived from quantity × currentPrice when omitted. */
  currentValue?: number;
  currency: string;
  purchaseDate?: string;
  geography?: string;
  industry?: string;
  /** your own note on why you hold it */
  note?: string;
  /** false = never shown individually (still counted in totals and allocation, as "Undisclosed") */
  public?: boolean;
}

export interface HistoryPoint {
  /** YYYY-MM-DD (month end) */
  date: string;
  /** total portfolio value in base currency */
  value: number;
  /** cumulative net deposits (deposits − withdrawals) in base currency */
  netContributions: number;
  /** optional cumulative time-weighted return from your broker (e.g. -0.05 = −5%). When present it is used as-is. */
  twr?: number;
}

export interface PortfolioData {
  /** true while using generated development data */
  sample: boolean;
  baseCurrency: string;
  /** units of base currency per 1 unit of each other currency */
  fx: Record<string, number>;
  asOf: string;
  holdings: Holding[];
  /** month-end history; leave empty if you don't have it — performance charts then show an empty state */
  history: HistoryPoint[];
}

export type JournalKind = "Observation" | "Decision" | "Research" | "Lesson" | "Portfolio update";

export interface JournalEntry {
  slug: string;
  kind: JournalKind;
  title: string;
  dek: string;
  date: string;
  body: string[];
  /** link the entry to holdings by id */
  holdings?: string[];
  sample?: boolean;
}
