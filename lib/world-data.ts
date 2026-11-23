import type { PublicView } from "./public";
import type { WorldLabel } from "@/components/world/World";
import type { WorldData } from "@/components/world/types";
import { dateLong, money, moneySigned, monthYear, pct } from "./format";

/**
 * What the world (and the rendered film) may show: the same privacy-filtered public view as the page.
 * Amounts appear only when the privacy settings show them.
 */
export function worldFromView(view: PublicView): { data: WorldData; labels: WorldLabel[] } {
  const cur = view.baseCurrency;
  const s = view.summary;
  const perf = view.performance;
  const amounts = view.showAmounts && s.value != null;
  const data: WorldData = {
    holdings: view.holdings.map((h) => ({ id: h.id, label: h.ticker ?? h.name, name: h.name, weight: h.weight, returnPct: h.returnPct, assetClass: h.assetClass, ...(amounts && h.value != null ? { value: money(h.value, cur) } : {}) })),
    history: perf ? perf.points.map((p) => ({ date: p.date, index: p.index })) : [],
    summary: {
      asOf: dateLong(view.asOf), currency: cur,
      ...(amounts ? { value: money(s.value!, cur), invested: money(s.invested!, cur), pnl: moneySigned(s.pnl!, cur), pnlSign: Math.sign(s.pnl!) } : {}),
      ...(s.returnPct != null ? { totalReturn: pct(s.returnPct, true) } : {}),
      ...(perf ? { twr: pct(perf.twr, true) } : {}),
    },
  };
  const labels: WorldLabel[] = [
    ...view.holdings.map((h) => ({ id: `engine:${h.id}`, holdingId: h.id, assetClass: h.assetClass, title: h.ticker ?? h.name, lines: [`${pct(h.weight)} of capital`] })),
    ...view.holdings.map((h) => ({
      id: `district:${h.id}`, holdingId: h.id, assetClass: h.assetClass, title: h.ticker ?? h.name,
      lines: [`${pct(h.weight)}${h.returnPct != null ? ` · ${pct(h.returnPct, true)}` : ""}`, ...(h.value != null ? [money(h.value, cur)] : [])],
    })),
    ...(perf ? [
      { id: "obs:start", title: monthYear(perf.points[0].date), lines: ["Index 100.0"] },
      { id: "obs:end", title: monthYear(perf.points[perf.points.length - 1].date), lines: [`Index ${perf.points[perf.points.length - 1].index.toFixed(1)} · ${pct(perf.twr, true)}`] },
    ] : []),
  ];
  return { data, labels };
}
