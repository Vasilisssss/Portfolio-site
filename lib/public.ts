import "server-only";
import { privacy, type SectionKey } from "@/content/privacy";
import { loadPortfolio } from "./data";
import type { AssetClass, Holding } from "./types";
import { ASSET_CLASSES } from "./types";

/**
 * The ONLY shape that leaves the server. Every field the privacy settings hide is
 * removed here, so it never reaches HTML, client props or the RSC payload.
 */
export interface PublicHolding {
  id: string;
  name: string;
  ticker?: string;
  assetClass: AssetClass;
  currency: string;
  geography?: string;
  industry?: string;
  note?: string;
  purchaseDate?: string;
  weight: number;
  returnPct: number | null;
  quantity?: number;
  unit?: string;
  avgPrice?: number;
  currentPrice?: number;
  invested?: number;
  value?: number;
  pnl?: number;
}

export interface Slice { key: string; label: string; weight: number; value?: number; undisclosed?: boolean }

export interface PerfPoint { date: string; index: number; value?: number; contributions?: number }

export interface PublicView {
  sample: boolean;
  asOf: string;
  baseCurrency: string;
  showAmounts: boolean;
  sections: Record<SectionKey, boolean>;
  summary: { value?: number; invested?: number; pnl?: number; returnPct: number | null; positions: number; classes: number };
  holdings: PublicHolding[];
  classes: { key: AssetClass; weight: number; value?: number; returnPct: number | null; count: number }[];
  allocation: { assetClass: Slice[]; investment: Slice[]; geography: Slice[]; industry: Slice[]; currency: Slice[] };
  performance: null | {
    /** "broker" = returns reported by your broker; "dietz" = computed from values and deposits */
    method: "broker" | "dietz";
    points: PerfPoint[];
    monthly: { date: string; r: number }[];
    yearly: { year: number; r: number }[];
    twr: number;
    /** only when at least a year of history exists — annualising shorter periods is misleading */
    annualised: number | null;
    best: { date: string; r: number };
    worst: { date: string; r: number };
    netDeposits?: number;
    marketGain?: number;
  };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

let cached: PublicView | null = null;

export function getPublicView(): PublicView {
  if (cached) return cached;
  const data = loadPortfolio();
  const fx = (c: string) => data.fx[c] ?? 1;
  const amt = privacy.showAmounts;

  const rows = data.holdings.map((h: Holding) => {
    const value = (h.currentValue ?? (h.quantity != null && h.currentPrice != null ? h.quantity * h.currentPrice : NaN)) * fx(h.currency);
    const cost = (h.invested ?? (h.quantity != null && h.avgPrice != null ? h.quantity * h.avgPrice : NaN)) * fx(h.currency);
    return { h, value: Number.isFinite(value) ? value : 0, cost: Number.isFinite(cost) ? cost : NaN };
  });
  const total = sum(rows.map((r) => r.value)) || 1;
  const knownCost = rows.filter((r) => Number.isFinite(r.cost));
  const invested = sum(knownCost.map((r) => r.cost));
  const valueWithCost = sum(knownCost.map((r) => r.value));

  const isPublic = (h: Holding) =>
    privacy.showHoldings && h.public !== false && (privacy.holdingsMode === "all" || privacy.selected.includes(h.id));

  const holdings: PublicHolding[] = rows
    .filter((r) => isPublic(r.h))
    .sort((a, b) => b.value - a.value)
    .map(({ h, value, cost }) => {
      const p: PublicHolding = {
        id: h.id, name: h.name, ticker: h.ticker, assetClass: h.assetClass, currency: h.currency,
        geography: h.geography, industry: h.industry, note: h.note,
        weight: value / total,
        returnPct: Number.isFinite(cost) && cost > 0 ? value / cost - 1 : null,
      };
      if (privacy.showPurchaseDates && h.purchaseDate) p.purchaseDate = h.purchaseDate;
      if (privacy.showQuantities && h.quantity != null) { p.quantity = h.quantity; p.unit = h.unit; }
      if (amt && privacy.showPrices) { p.avgPrice = h.avgPrice; p.currentPrice = h.currentPrice; }
      if (amt) { p.value = value; if (Number.isFinite(cost)) { p.invested = cost; p.pnl = value - cost; } }
      // strip undefined keys so nothing empty is serialised
      return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as PublicHolding;
    });

  const group = (keyOf: (h: Holding) => string | undefined) => {
    const m = new Map<string, number>();
    rows.forEach((r) => { const k = keyOf(r.h) || "Unspecified"; m.set(k, (m.get(k) ?? 0) + r.value); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, weight: v / total, ...(amt ? { value: v } : {}) }));
  };

  const classes = ASSET_CLASSES.map((c) => {
    const rs = rows.filter((r) => r.h.assetClass === c);
    const v = sum(rs.map((r) => r.value));
    const kc = rs.filter((r) => Number.isFinite(r.cost));
    const cc = sum(kc.map((r) => r.cost)), cv = sum(kc.map((r) => r.value));
    return { key: c, weight: v / total, ...(amt ? { value: v } : {}), returnPct: cc > 0 ? cv / cc - 1 : null, count: rs.length };
  }).filter((c) => c.count > 0).sort((a, b) => b.weight - a.weight);

  const hiddenValue = sum(rows.filter((r) => !isPublic(r.h)).map((r) => r.value));
  const investment: Slice[] = privacy.showHoldings
    ? [
        ...holdings.map((h) => ({ key: h.id, label: h.name, weight: h.weight, ...(amt ? { value: h.value } : {}) })),
        ...(hiddenValue > 0 ? [{ key: "undisclosed", label: "Undisclosed", weight: hiddenValue / total, undisclosed: true, ...(amt ? { value: hiddenValue } : {}) }] : []),
      ]
    : [];

  // performance — Modified Dietz monthly returns, chained (time-weighted), so deposits never count as gains
  let performance: PublicView["performance"] = null;
  const hist = data.history;
  if (hist.length >= 2) {
    const monthly: { date: string; r: number }[] = [];
    const points: PerfPoint[] = [{ date: hist[0].date, index: 100, ...(amt ? { value: hist[0].value, contributions: hist[0].netContributions } : {}) }];
    let idx = 100;
    const brokerTwr = hist.every((h) => typeof h.twr === "number");
    for (let i = 1; i < hist.length; i++) {
      const flow = hist[i].netContributions - hist[i - 1].netContributions;
      const base = hist[i - 1].value + flow / 2;
      const r = brokerTwr
        ? (1 + hist[i].twr!) / (1 + hist[i - 1].twr!) - 1 // broker-reported time-weighted return
        : base > 0 ? (hist[i].value - hist[i - 1].value - flow) / base : 0;
      monthly.push({ date: hist[i].date, r });
      idx *= 1 + r;
      points.push({ date: hist[i].date, index: idx, ...(amt ? { value: hist[i].value, contributions: hist[i].netContributions } : {}) });
    }
    const years = new Map<number, number>();
    monthly.forEach((m) => { const y = +m.date.slice(0, 4); years.set(y, (years.get(y) ?? 1) * (1 + m.r)); });
    const twr = brokerTwr ? (1 + hist[hist.length - 1].twr!) / (1 + hist[0].twr!) - 1 : idx / 100 - 1;
    const span = (Date.parse(hist[hist.length - 1].date) - Date.parse(hist[0].date)) / (365.25 * 86400000);
    const sorted = [...monthly].sort((a, b) => b.r - a.r);
    const last = hist[hist.length - 1];
    performance = {
      method: brokerTwr ? "broker" : "dietz",
      points, monthly,
      yearly: [...years.entries()].map(([year, g]) => ({ year, r: g - 1 })),
      twr, annualised: span >= 1 ? Math.pow(1 + twr, 1 / span) - 1 : null,
      best: sorted[0], worst: sorted[sorted.length - 1],
      ...(amt ? { netDeposits: last.netContributions, marketGain: last.value - last.netContributions } : {}),
    };
  }

  cached = {
    sample: data.sample,
    asOf: data.asOf,
    baseCurrency: data.baseCurrency,
    showAmounts: amt,
    sections: { ...privacy.sections, investments: privacy.sections.investments && privacy.showHoldings },
    summary: {
      ...(amt ? { value: total, invested, pnl: valueWithCost - invested } : {}),
      returnPct: invested > 0 ? valueWithCost / invested - 1 : null,
      positions: privacy.showHoldings ? data.holdings.length : 0,
      classes: classes.length,
    },
    holdings,
    classes,
    allocation: {
      assetClass: classes.map((c) => ({ key: c.key, label: c.key, weight: c.weight, ...(amt ? { value: c.value } : {}) })),
      investment,
      geography: group((h) => h.geography),
      industry: group((h) => h.industry),
      currency: group((h) => h.currency),
    },
    performance,
  };
  return cached;
}

export const getPublicHolding = (id: string) => getPublicView().holdings.find((h) => h.id === id);
