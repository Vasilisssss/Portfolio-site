import "server-only";
import { privacy, type SectionKey } from "@/content/privacy";
import { loadPortfolio } from "./data";
import { computeMetrics } from "./portfolio";
import type { AssetClass, Holding } from "./types";
import fs from "node:fs";
import path from "node:path";

/**
 * The ONLY shape that leaves the server. It is derived from lib/portfolio.ts (the single source of truth)
 * and filtered by content/privacy.ts — hidden fields never reach HTML, client props or the page payload.
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
  brand?: string;
  accent?: string;
  /** URL of the company artwork (public/brand/<id>.svg), when there is one */
  artSrc?: string;
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
  source?: string;
  asOf: string;
  /** when the data last changed (ISO, UTC) */
  updatedAt?: string;
  baseCurrency: string;
  showAmounts: boolean;
  sections: Record<SectionKey, boolean>;
  summary: {
    value?: number;
    invested?: number;
    investedSource: "deposits" | "costBasis";
    pnl?: number;
    positionsPnl?: number;
    otherPnl?: number;
    returnPct: number | null;
    positions: number;
    classes: number;
  };
  holdings: PublicHolding[];
  classes: { key: AssetClass; weight: number; value?: number; returnPct: number | null; count: number }[];
  allocation: { assetClass: Slice[]; investment: Slice[]; geography: Slice[]; industry: Slice[]; currency: Slice[] };
  performance: null | {
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

const cache = new Map<boolean, PublicView>();
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * `reveal` is for the owner-only private view (app/private), which is published only encrypted
 * (tools/private/seal.mjs): it shows amounts, quantities and prices regardless of content/privacy.ts.
 */
export function getPublicView({ reveal = false }: { reveal?: boolean } = {}): PublicView {
  const hit = cache.get(reveal);
  if (hit) return hit;
  const data = loadPortfolio();
  const m = computeMetrics(data);
  const amt = reveal || privacy.showAmounts;
  const showQuantities = reveal || privacy.showQuantities;
  const showPrices = reveal || privacy.showPrices;

  const isPublic = (h: Holding) =>
    privacy.showHoldings && h.public !== false && (privacy.holdingsMode === "all" || privacy.selected.includes(h.id));

  const holdings: PublicHolding[] = m.positions
    .filter((p) => isPublic(p.holding))
    .map((p) => {
      const h = p.holding;
      return clean<PublicHolding>({
        id: h.id, name: h.name, ticker: h.ticker, assetClass: h.assetClass, currency: h.currency,
        geography: h.geography, industry: h.industry, note: h.note, brand: h.brand,
        accent: h.accent && /^#[0-9a-f]{3,8}$/i.test(h.accent) ? h.accent : undefined,
        artSrc: fs.existsSync(path.join(process.cwd(), "public", "brand", `${h.id}.svg`)) ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/${h.id}.svg` : undefined,
        weight: p.weight, returnPct: p.returnPct,
        purchaseDate: privacy.showPurchaseDates ? h.purchaseDate : undefined,
        quantity: showQuantities ? h.quantity : undefined,
        unit: showQuantities ? h.unit : undefined,
        avgPrice: amt && showPrices ? h.avgPrice : undefined,
        currentPrice: amt && showPrices ? h.currentPrice : undefined,
        value: amt ? p.value : undefined,
        invested: amt && p.cost != null ? p.cost : undefined,
        pnl: amt && p.pnl != null ? p.pnl : undefined,
      });
    });

  const slice = (key: string, label: string, weight: number, value: number, extra: Partial<Slice> = {}): Slice =>
    clean<Slice>({ key, label, weight, value: amt ? value : undefined, ...extra });

  const hiddenValue = m.positions.filter((p) => !isPublic(p.holding)).reduce((s, p) => s + p.value, 0);
  const investment: Slice[] = privacy.showHoldings
    ? [
        ...m.positions.filter((p) => isPublic(p.holding)).map((p) => slice(p.holding.id, p.holding.name, p.weight, p.value)),
        ...(hiddenValue > 0 ? [slice("undisclosed", "Undisclosed", hiddenValue / (m.totalValue || 1), hiddenValue, { undisclosed: true })] : []),
      ]
    : [];

  // performance — broker TWR when provided, otherwise monthly Modified Dietz, chained
  let performance: PublicView["performance"] = null;
  const hist = m.history;
  if (hist.length >= 2) {
    const brokerTwr = hist.every((h) => typeof h.twr === "number");
    const monthly: { date: string; r: number }[] = [];
    const points: PerfPoint[] = [];
    let idx = 100;
    hist.forEach((h, i) => {
      if (i > 0) {
        const prev = hist[i - 1];
        const flow = h.netContributions - prev.netContributions;
        const base = prev.value + flow / 2;
        const r = brokerTwr ? (1 + h.twr!) / (1 + prev.twr!) - 1 : base > 0 ? (h.value - prev.value - flow) / base : 0;
        monthly.push({ date: h.date, r });
        idx *= 1 + r;
      }
      points.push(clean<PerfPoint>({ date: h.date, index: idx, value: amt ? h.value : undefined, contributions: amt ? h.netContributions : undefined }));
    });
    const years = new Map<number, number>();
    monthly.forEach((x) => { const y = +x.date.slice(0, 4); years.set(y, (years.get(y) ?? 1) * (1 + x.r)); });
    const twr = idx / 100 - 1;
    const span = (Date.parse(hist[hist.length - 1].date) - Date.parse(hist[0].date)) / (365.25 * 86400000);
    const sorted = [...monthly].sort((a, b) => b.r - a.r);
    performance = clean({
      method: brokerTwr ? ("broker" as const) : ("dietz" as const),
      points, monthly,
      yearly: [...years.entries()].map(([year, g]) => ({ year, r: g - 1 })),
      twr,
      annualised: span >= 1 ? Math.pow(1 + twr, 1 / span) - 1 : null,
      best: sorted[0], worst: sorted[sorted.length - 1],
      // the same figures as the overview — one definition, see lib/portfolio.ts
      netDeposits: amt ? m.investedCapital : undefined,
      marketGain: amt ? m.totalPnl : undefined,
    });
  }

  const view: PublicView = {
    sample: data.sample,
    source: data.source,
    asOf: data.asOf,
    updatedAt: data.updatedAt,
    baseCurrency: data.baseCurrency,
    showAmounts: amt,
    sections: { ...privacy.sections, investments: privacy.sections.investments && privacy.showHoldings },
    summary: clean({
      value: amt ? m.totalValue : undefined,
      invested: amt ? m.investedCapital : undefined,
      investedSource: m.investedSource,
      pnl: amt ? m.totalPnl : undefined,
      positionsPnl: amt ? m.positionsPnl : undefined,
      otherPnl: amt ? m.otherPnl : undefined,
      returnPct: m.totalReturn,
      positions: privacy.showHoldings ? m.positions.length : 0,
      classes: m.byClass.length,
    }),
    holdings,
    classes: m.byClass.map((c) => clean({ key: c.key, weight: c.weight, value: amt ? c.value : undefined, returnPct: c.returnPct, count: c.count })),
    allocation: {
      assetClass: m.byClass.map((c) => slice(c.key, c.key, c.weight, c.value)),
      investment,
      geography: m.breakdown((h) => h.geography).map((b) => slice(b.key, b.key, b.weight, b.value)),
      industry: m.breakdown((h) => h.industry).map((b) => slice(b.key, b.key, b.weight, b.value)),
      currency: m.breakdown((h) => h.currency).map((b) => slice(b.key, b.key, b.weight, b.value)),
    },
    performance,
  };
  cache.set(reveal, view);
  return view;
}

export const getPublicHolding = (id: string) => getPublicView().holdings.find((h) => h.id === id);
