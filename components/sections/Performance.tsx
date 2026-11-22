"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { PublicHolding, PublicView } from "@/lib/public";
import { money, moneyCompact, monthName, monthYear, pct } from "@/lib/format";

type Perf = NonNullable<PublicView["performance"]>;
const RANGES = { "1Y": 12, "3Y": 36, "5Y": 60, ALL: Infinity } as const;
type RangeKey = keyof typeof RANGES;
const W = 1000, H = 360;

function MainChart({ perf, amounts, currency }: { perf: Perf; amounts: boolean; currency: string }) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [mode, setMode] = useState<"value" | "index">(amounts ? "value" : "index");
  const [hover, setHover] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  const v = useMemo(() => {
    const all = perf.points;
    const pts = all.slice(Math.max(0, all.length - 1 - RANGES[range]));
    const base = pts[0].index;
    const rows = pts.map((p) => ({ date: p.date, idx: (p.index / base) * 100, value: p.value, contrib: p.contributions }));
    const ys = mode === "value" ? rows.flatMap((r) => [r.value ?? 0, r.contrib ?? 0]) : rows.map((r) => r.idx);
    let mn = Math.min(...ys), mx = Math.max(...ys);
    const pad = (mx - mn) * 0.1 || 1;
    mn = mode === "value" ? Math.max(0, mn - pad) : mn - pad; mx += pad;
    const X = (i: number) => (i / (rows.length - 1)) * W;
    const Y = (y: number) => 16 + (1 - (y - mn) / (mx - mn)) * (H - 32);
    const path = (get: (r: (typeof rows)[number]) => number) => rows.map((r, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(get(r)).toFixed(1)}`).join("");
    const main = mode === "value" ? path((r) => r.value ?? 0) : path((r) => r.idx);
    const contrib = mode === "value" ? path((r) => r.contrib ?? 0) : "";
    const grid = [0.1, 0.37, 0.63, 0.9].map((g) => { const y = mn + (mx - mn) * g; return { y: Y(y), label: mode === "value" ? moneyCompact(y, currency) : y.toFixed(0) }; });
    const first = rows[0], last = rows[rows.length - 1];
    return { rows, X, Y, main, area: `${main}L${W} ${H}L0 ${H}Z`, contrib, contribArea: contrib ? `${contrib}L${W} ${H}L0 ${H}Z` : "", grid, change: last.idx / first.idx - 1 };
  }, [perf, range, mode, currency]);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo("[data-draw]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power3.inOut", scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
    gsap.fromTo("[data-fade]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, delay: 0.4, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
  }, { scope: root, dependencies: [range, mode], revertOnUpdate: true });

  const hp = hover >= 0 ? v.rows[hover] : null;
  const left = hp ? (v.X(hover) / W) * 100 : 0;
  const move = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (v.rows.length - 1))); };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, Math.min(v.rows.length - 1, (h < 0 ? v.rows.length - 1 : h) + (e.key === "ArrowRight" ? 1 : -1)))); }
  };

  return (
    <div ref={root} className="glass flex flex-col gap-6 rounded-[28px] p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.18em] text-mute">
          {amounts && (
            <div role="group" aria-label="Chart mode" className="flex gap-1 rounded-full bg-pearl-2/70 p-1">
              {(["value", "index"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setHover(-1); }}
                  className={`h-9 rounded-full px-4 text-[11px] uppercase tracking-[0.14em] ${mode === m ? "bg-snow text-graphite shadow-sm" : "text-mute hover:text-graphite"}`}>
                  {m === "value" ? "Value vs deposits" : "Returns only"}
                </button>
              ))}
            </div>
          )}
          {mode === "value" ? (
            <>
              <span className="flex items-center gap-2"><span className="h-[2px] w-5 bg-gradient-to-r from-ice-deep to-lavender-deep" />Portfolio value</span>
              <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-lavender/70" />Net deposits</span>
            </>
          ) : (
            <span className="flex items-center gap-2"><span className="h-[2px] w-5 bg-gradient-to-r from-ice-deep to-lavender-deep" />Growth of 100, time-weighted</span>
          )}
          <span className={`tnum ${v.change >= 0 ? "text-gain" : "text-loss"}`}>{pct(v.change, true)} · {range}</span>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-1 rounded-full bg-pearl-2/70 p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={range === k} onClick={() => { setRange(k); setHover(-1); }}
              className={`h-9 min-w-12 rounded-full px-3 text-[11px] tracking-[0.12em] ${range === k ? "bg-graphite text-snow" : "text-mute hover:text-graphite"}`}>{k}</button>
          ))}
        </div>
      </div>

      <div tabIndex={0} role="img" onPointerMove={move} onPointerLeave={() => setHover(-1)} onKeyDown={key} onBlur={() => setHover(-1)}
        aria-label={`${mode === "value" ? "Portfolio value against net deposits" : "Time-weighted growth of 100"} over ${range}: ${pct(v.change, true)} time-weighted. Use arrow keys to inspect months.`}
        className="relative h-[300px] cursor-crosshair md:h-[400px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id="pvLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2e6a99" /><stop offset="1" stopColor="#5a52a6" /></linearGradient>
            <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fb3e0" stopOpacity="0.32" /><stop offset="1" stopColor="#cde6fb" stopOpacity="0" /></linearGradient>
          </defs>
          {v.grid.map((g) => <path key={g.y} d={`M0 ${g.y.toFixed(1)}H${W}`} stroke="rgba(36,38,43,0.08)" vectorEffect="non-scaling-stroke" />)}
          {mode === "value" && <path data-fade d={v.contribArea} fill="#dcd6fb" fillOpacity={0.6} />}
          {mode === "value" && <path data-fade d={v.contrib} fill="none" stroke="#5a52a6" strokeOpacity={0.5} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
          <path data-fade d={v.area} fill="url(#pvFill)" />
          <path data-draw d={v.main} fill="none" stroke="url(#pvLine)" strokeWidth={2} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" />
        </svg>
        {v.grid.map((g) => <span key={g.label + g.y} aria-hidden className="tnum absolute right-0 -translate-y-[120%] text-[10px] tracking-[0.1em] text-mute" style={{ top: `${(g.y / H) * 100}%` }}>{g.label}</span>)}
        {hp && (
          <>
            <span aria-hidden className="absolute inset-y-0 w-px bg-graphite/20" style={{ left: `${left}%` }} />
            <span aria-hidden className="absolute -ml-[6px] -mt-[6px] h-3 w-3 rounded-full border-2 border-snow bg-lavender-deep shadow" style={{ left: `${left}%`, top: `${(v.Y(mode === "value" ? hp.value ?? 0 : hp.idx) / H) * 100}%` }} />
            <span aria-live="polite" className="glass tnum pointer-events-none absolute top-2 flex flex-col gap-1 whitespace-nowrap rounded-2xl px-4 py-3 text-xs"
              style={{ left: `${left}%`, transform: `translateX(${left > 72 ? -105 : left < 28 ? 5 : -50}%)` }}>
              <span className="label">{monthYear(hp.date)}</span>
              {mode === "value" && hp.value != null && hp.contrib != null ? (
                <>
                  <span className="font-serif text-[24px]">{money(hp.value, currency)}</span>
                  <span className="text-mute">Deposited {money(hp.contrib, currency)}</span>
                  <span className={hp.value - hp.contrib >= 0 ? "text-gain" : "text-loss"}>Market gain {money(hp.value - hp.contrib, currency)}</span>
                </>
              ) : (
                <span className="font-serif text-[24px]">{hp.idx.toFixed(1)}</span>
              )}
            </span>
          </>
        )}
      </div>
      <div className="tnum flex justify-between text-[10px] tracking-[0.14em] text-mute">
        <span>{monthYear(v.rows[0].date)}</span><span>{monthYear(v.rows[v.rows.length - 1].date)}</span>
      </div>
    </div>
  );
}

function cellStyle(r: number) {
  const a = Math.min(1, Math.abs(r) / 0.06);
  return r >= 0 ? { background: `rgba(127,179,224,${0.15 + a * 0.6})` } : { background: `rgba(163,69,106,${0.1 + a * 0.4})` };
}

function Heatmap({ perf }: { perf: Perf }) {
  const years = perf.yearly.map((y) => y.year);
  const byKey = new Map(perf.monthly.map((m) => [m.date.slice(0, 7), m.r]));
  return (
    <div className="glass overflow-x-auto rounded-[28px] p-5 md:p-8">
      <h3 className="label mb-5">Monthly returns</h3>
      <table className="tnum w-full min-w-[760px] border-separate border-spacing-1 text-center text-[11px]">
        <caption className="sr-only">Monthly time-weighted returns by year</caption>
        <thead><tr><th scope="col" className="w-14 text-left font-normal text-mute">Year</th>{Array.from({ length: 12 }, (_, i) => <th key={i} scope="col" className="font-normal text-mute">{monthName(i)}</th>)}<th scope="col" className="font-medium text-graphite">Year</th></tr></thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <th scope="row" className="text-left font-normal text-graphite-2">{y}</th>
              {Array.from({ length: 12 }, (_, m) => {
                const r = byKey.get(`${y}-${String(m + 1).padStart(2, "0")}`);
                return <td key={m} className="h-10 rounded-lg" style={r == null ? undefined : cellStyle(r)}>{r == null ? "" : pct(r, true)}</td>;
              })}
              {(() => { const yr = perf.yearly.find((x) => x.year === y)!.r; return <td className={`h-10 rounded-lg font-medium ${yr >= 0 ? "text-gain" : "text-loss"}`}>{pct(yr, true)}</td>; })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearBars({ perf }: { perf: Perf }) {
  const root = useRef<HTMLDivElement>(null);
  const max = Math.max(...perf.yearly.map((y) => Math.abs(y.r)), 0.01);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-yb]", { scaleY: 0, duration: 1.2, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: root.current, start: "top 85%", once: true } });
  }, { scope: root });
  return (
    <div ref={root} className="glass flex flex-col gap-6 rounded-[28px] p-5 md:p-8">
      <h3 className="label">Yearly returns</h3>
      <div className="relative flex h-[240px] items-stretch gap-3" role="img" aria-label={perf.yearly.map((y) => `${y.year} ${pct(y.r, true)}`).join(", ")}>
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-graphite/15" />
        {perf.yearly.map((y) => (
          <div key={y.year} className="relative flex flex-1 flex-col items-center">
            <div className="relative h-full w-full">
              <span data-yb className={`absolute left-1/2 w-[60%] max-w-14 -translate-x-1/2 rounded-md ${y.r >= 0 ? "origin-bottom bg-gradient-to-t from-ice to-[#7fb3e0]" : "origin-top bg-gradient-to-b from-[#f3d3e2] to-[#d98aae]"}`}
                style={y.r >= 0 ? { bottom: "50%", height: `${(y.r / max) * 46}%` } : { top: "50%", height: `${(-y.r / max) * 46}%` }} />
              <span className={`tnum absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] ${y.r >= 0 ? "text-gain" : "text-loss"}`}
                style={y.r >= 0 ? { bottom: `calc(50% + ${(y.r / max) * 46}% + 6px)` } : { top: `calc(50% + ${(-y.r / max) * 46}% + 6px)` }}>{pct(y.r, true)}</span>
            </div>
            <span className="tnum mt-2 text-[11px] text-mute">{y.year}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HoldingBars({ holdings }: { holdings: PublicHolding[] }) {
  const rows = holdings.filter((h) => h.returnPct != null).sort((a, b) => b.returnPct! - a.returnPct!);
  const root = useRef<HTMLDivElement>(null);
  const max = Math.max(...rows.map((h) => Math.abs(h.returnPct!)), 0.01);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-hb]", { scaleX: 0, duration: 1.2, ease: "expo.out", stagger: 0.04, scrollTrigger: { trigger: root.current, start: "top 85%", once: true } });
  }, { scope: root });
  if (!rows.length) return null;
  const hasNeg = rows.some((h) => h.returnPct! < 0);
  return (
    <div ref={root} className="glass flex flex-col gap-5 rounded-[28px] p-5 md:p-8">
      <h3 className="label">Return by investment, since purchase</h3>
      <ul className="flex flex-col gap-1">
        {rows.map((h) => {
          const r = h.returnPct!;
          const w = (Math.abs(r) / max) * (hasNeg ? 50 : 100);
          return (
            <li key={h.id}>
              <Link href={`/investments/${h.id}`} data-cursor="View" className="group grid grid-cols-[minmax(120px,1.1fr)_minmax(0,2fr)_72px] items-center gap-4 rounded-xl px-2 py-2.5 hover:bg-snow/60">
                <span className="truncate text-[14px] group-hover:text-lavender-deep">{h.name}</span>
                <span className="relative h-2.5 rounded-full bg-pearl-2">
                  <span data-hb className={`absolute top-0 h-full rounded-full ${r >= 0 ? "origin-left bg-gradient-to-r from-ice to-[#7fb3e0]" : "origin-right bg-gradient-to-l from-[#f3d3e2] to-[#d98aae]"}`}
                    style={r >= 0 ? { left: hasNeg ? "50%" : 0, width: `${w}%` } : { right: "50%", width: `${w}%` }} />
                </span>
                <span className={`tnum text-right text-[14px] ${r >= 0 ? "text-gain" : "text-loss"}`}>{pct(r, true)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Performance({ perf, holdings, amounts, currency }: { perf: Perf; holdings: PublicHolding[]; amounts: boolean; currency: string }) {
  const kpis = [
    { label: "Time-weighted return", v: pct(perf.twr, true), tone: perf.twr },
    ...(perf.annualised != null ? [{ label: "Annualised", v: pct(perf.annualised, true), tone: perf.annualised }] : []),
    ...(perf.netDeposits != null ? [{ label: "Invested capital", v: money(perf.netDeposits, currency), tone: 0 }] : []),
    ...(perf.marketGain != null ? [{ label: "Profit / loss", v: (perf.marketGain >= 0 ? "+" : "") + money(perf.marketGain, currency), tone: perf.marketGain }] : []),
    { label: `Best month · ${monthYear(perf.best.date)}`, v: pct(perf.best.r, true), tone: perf.best.r },
    { label: `Worst month · ${monthYear(perf.worst.date)}`, v: pct(perf.worst.r, true), tone: perf.worst.r },
  ];
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden rounded-[28px] bg-white/70">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-2 bg-pearl/80 p-6 backdrop-blur">
            <dt className="label">{k.label}</dt>
            <dd className={`tnum font-serif text-[clamp(26px,2.4vw,34px)] leading-none ${k.tone > 0 ? "text-gain" : k.tone < 0 ? "text-loss" : ""}`}>{k.v}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-[720px] text-[13px] leading-[1.7] text-mute">
        {perf.method === "broker"
          ? "Returns are the time-weighted returns reported by my broker: money I deposit or withdraw never counts as performance."
          : "Returns are time-weighted (monthly Modified Dietz, chained): money I deposit or withdraw never counts as performance."}
        {amounts && " The shaded band shows what I put in; everything above it is market gain."}
      </p>
      <MainChart perf={perf} amounts={amounts} currency={currency} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <YearBars perf={perf} />
        <HoldingBars holdings={holdings} />
      </div>
      <Heatmap perf={perf} />
    </div>
  );
}
