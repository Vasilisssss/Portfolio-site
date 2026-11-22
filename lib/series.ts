import { portfolio, type Investment } from "@/content/portfolio";
import { mulberry32 } from "./random";

/**
 * ILLUSTRATIVE: a seeded random walk scaled to end at portfolio.totalValue.
 * Replace `buildSeries` with your real daily NAV history (same shape) when available.
 */
export interface SeriesPoint { t: number; v: number; b: number }

const TRADING_DAYS = 252;
const YEARS = 6;

export function buildSeries(): SeriesPoint[] {
  const rnd = mulberry32(7741);
  const n = TRADING_DAYS * YEARS;
  const raw: { v: number; b: number }[] = [];
  let v = 1, b = 1;
  for (let i = 0; i < n; i++) {
    v *= 1 + 0.00036 + (rnd() - 0.5) * 0.015;
    b *= 1 + 0.00027 + (rnd() - 0.5) * 0.018;
    raw.push({ v, b });
  }
  const k = portfolio.totalValue / raw[n - 1].v;
  const end = Date.parse(portfolio.asOf + "T12:00:00Z");
  const dayMs = (86_400_000 * 365) / TRADING_DAYS;
  return raw.map((p, i) => ({ t: end - (n - 1 - i) * dayMs, v: p.v * k, b: p.b }));
}

export const RANGES = { "1M": 21, "3M": 63, "6M": 126, "1Y": 252, "3Y": 756, ALL: Infinity } as const;
export type RangeKey = keyof typeof RANGES;

export function stats(series: SeriesPoint[]) {
  let peak = series[0].v, dd = 0, sum = 0, sum2 = 0;
  for (let i = 1; i < series.length; i++) {
    const r = series[i].v / series[i - 1].v - 1;
    sum += r; sum2 += r * r;
    peak = Math.max(peak, series[i].v);
    dd = Math.min(dd, series[i].v / peak - 1);
  }
  const n = series.length - 1;
  const mean = sum / n;
  const first = series[0].v, last = series[series.length - 1].v;
  return {
    inception: last / first - 1,
    cagr: Math.pow(last / first, TRADING_DAYS / series.length) - 1,
    volatility: Math.sqrt(sum2 / n - mean * mean) * Math.sqrt(TRADING_DAYS),
    maxDrawdown: dd,
  };
}

/** small per-holding trend line ending at the holding's return */
export function sparkPath(inv: Investment, index: number, w = 140, h = 36) {
  const rnd = mulberry32(100 + index * 31);
  const pts: number[] = [];
  let x = 1;
  for (let j = 0; j < 60; j++) { x *= 1 + (rnd() - 0.47) * 0.06; pts.push(x); }
  const adj = (1 + inv.returnSinceEntry) / pts[59];
  const sp = pts.map((p, j) => p + (adj - 1) * (j / 59));
  const mn = Math.min(...sp), mx = Math.max(...sp);
  return sp.map((p, j) => `${j ? "L" : "M"}${((j * w) / 59).toFixed(1)} ${(h - 4 - ((p - mn) / (mx - mn || 1)) * (h - 8)).toFixed(1)}`).join("");
}
