import "server-only";
import type { AssetClass, Holding, PortfolioData } from "./types";
import { ASSET_CLASSES } from "./types";

/**
 * SINGLE SOURCE OF TRUTH for every financial figure on the site.
 * All amounts are in the base currency. Nothing is estimated: missing inputs stay missing.
 *
 * Definitions
 *  value(position)       = currentValue ?? quantity × currentPrice, converted at fx
 *  cost(position)        = invested ?? quantity × avgPrice, converted at fx (broker cost basis incl. commissions)
 *  totalValue            = Σ value
 *  investedCapital       = net deposits (deposits − withdrawals) from history, else Σ cost when there is no history
 *  totalPnl              = totalValue − investedCapital
 *  positionsPnl          = Σ (value − cost) over positions with a cost basis  (unrealised P/L)
 *  otherPnl              = totalPnl − positionsPnl  (fees, FX, interest and anything not in open positions)
 *  totalReturn           = totalPnl / investedCapital
 *  history               = broker month-end history; its final point is valued exactly like totalValue so every chart ends on the headline number
 */
export interface Position {
  holding: Holding;
  value: number;
  cost: number | null;
  pnl: number | null;
  returnPct: number | null;
  weight: number;
}

export interface Metrics {
  data: PortfolioData;
  positions: Position[];
  totalValue: number;
  costBasis: number;
  investedCapital: number;
  investedSource: "deposits" | "costBasis";
  totalPnl: number;
  positionsPnl: number;
  otherPnl: number;
  totalReturn: number | null;
  byClass: { key: AssetClass; value: number; cost: number; weight: number; returnPct: number | null; count: number }[];
  breakdown: (keyOf: (h: Holding) => string | undefined) => { key: string; value: number; weight: number }[];
  history: { date: string; value: number; netContributions: number; twr?: number }[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

let cached: Metrics | null = null;

export function computeMetrics(data: PortfolioData): Metrics {
  if (cached && cached.data === data) return cached;
  const fx = (c: string) => (c === data.baseCurrency ? 1 : data.fx[c] ?? 1);

  const raw = data.holdings.map((h) => {
    const v = h.currentValue ?? (h.quantity != null && h.currentPrice != null ? h.quantity * h.currentPrice : null);
    const c = h.invested ?? (h.quantity != null && h.avgPrice != null ? h.quantity * h.avgPrice : null);
    return { h, value: v == null ? 0 : v * fx(h.currency), cost: c == null ? null : c * fx(h.currency) };
  });
  const totalValue = sum(raw.map((r) => r.value));
  const denom = totalValue || 1;

  const positions: Position[] = raw
    .map((r) => ({
      holding: r.h,
      value: r.value,
      cost: r.cost,
      pnl: r.cost == null ? null : r.value - r.cost,
      returnPct: r.cost && r.cost > 0 ? r.value / r.cost - 1 : null,
      weight: r.value / denom,
    }))
    .sort((a, b) => b.value - a.value);

  const withCost = positions.filter((p) => p.cost != null);
  const costBasis = sum(withCost.map((p) => p.cost!));
  const positionsPnl = sum(withCost.map((p) => p.pnl!));

  // history: align the last point with today's valuation when it is the same day
  const history = data.history.map((p) => ({ ...p }));
  const last = history[history.length - 1];
  if (last && last.date === data.asOf) last.value = totalValue;

  const investedSource = last ? "deposits" : "costBasis";
  const investedCapital = last ? last.netContributions : costBasis;
  const totalPnl = totalValue - investedCapital;

  const byClass = ASSET_CLASSES.map((key) => {
    const ps = positions.filter((p) => p.holding.assetClass === key);
    const value = sum(ps.map((p) => p.value));
    const wc = ps.filter((p) => p.cost != null);
    const cost = sum(wc.map((p) => p.cost!));
    const cv = sum(wc.map((p) => p.value));
    return { key, value, cost, weight: value / denom, returnPct: cost > 0 ? cv / cost - 1 : null, count: ps.length };
  }).filter((c) => c.count > 0).sort((a, b) => b.value - a.value);

  const breakdown = (keyOf: (h: Holding) => string | undefined) => {
    const m = new Map<string, number>();
    positions.forEach((p) => { const k = keyOf(p.holding) || "Unspecified"; m.set(k, (m.get(k) ?? 0) + p.value); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, value, weight: value / denom }));
  };

  cached = {
    data, positions, totalValue, costBasis, investedCapital, investedSource,
    totalPnl, positionsPnl, otherPnl: totalPnl - positionsPnl,
    totalReturn: investedCapital > 0 ? totalPnl / investedCapital : null,
    byClass, breakdown, history,
  };
  return cached;
}
