"use client";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import Assemble from "@/components/motion/Assemble";
import type { PublicHolding, PublicView } from "@/lib/public";
import { money, moneyCompact, monthName, monthYear, pct } from "@/lib/format";
import { linearPath, monotonePath, niceTicks, tickIndices, type Pt } from "@/lib/chart";
import { useSize } from "@/components/ui/useSize";

type Perf = NonNullable<PublicView["performance"]>;
const RANGES = { "1Y": 12, "3Y": 36, "5Y": 60, ALL: Infinity } as const;
type RangeKey = keyof typeof RANGES;


function MainChart({ perf, amounts, currency }: { perf: Perf; amounts: boolean; currency: string }) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [mode, setMode] = useState<"value" | "index">(amounts ? "value" : "index");
  const [hover, setHover] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const [plot, { w, h }] = useSize<HTMLDivElement>({ w: 1000, h: 400 });
  const uid = useId().replace(/:/g, "");

  const v = useMemo(() => {
    const all = perf.points;
    const pts = all.slice(Math.max(0, all.length - 1 - RANGES[range]));
    const base = pts[0].index;
    const rows = pts.map((p) => ({ date: p.date, idx: (p.index / base) * 100, value: p.value, contrib: p.contributions }));
    const ys = mode === "value" ? rows.flatMap((r) => [r.value ?? 0, r.contrib ?? 0]) : [...rows.map((r) => r.idx), 100];
    const narrow = w < 560;
    const padL = 0, padR = narrow ? 52 : 68, padT = 14, padB = 34;
    const iw = Math.max(10, w - padL - padR), ih = Math.max(10, h - padT - padB);
    const nt = niceTicks(mode === "value" ? Math.max(0, Math.min(...ys)) : Math.min(...ys), Math.max(...ys), narrow ? 3 : 4);
    const lo = mode === "value" ? Math.max(0, nt.lo) : nt.lo, hi = nt.hi;
    const X = (i: number) => padL + (rows.length > 1 ? (i / (rows.length - 1)) * iw : iw / 2);
    const Y = (y: number) => padT + (1 - (y - lo) / (hi - lo || 1)) * ih;
    const crisp = (y: number) => Math.round(y) + 0.5;
    const mainPts = rows.map((r, i) => [X(i), Y(mode === "value" ? r.value ?? 0 : r.idx)] as Pt);
    const main = monotonePath(mainPts);
    const bottom = padT + ih;
    const close = (d: string) => `${d}L${X(rows.length - 1).toFixed(2)} ${bottom}L${X(0).toFixed(2)} ${bottom}Z`;
    const contrib = mode === "value" ? linearPath(rows.map((r, i) => [X(i), Y(r.contrib ?? 0)] as Pt)) : "";
    const fmtY = (y: number) => (mode === "value" ? moneyCompact(y, currency) : y.toFixed(nt.step < 1 ? 1 : 0));
    const grid = nt.ticks.filter((t) => t >= lo - 1e-9 && t <= hi + 1e-9).map((t) => ({ y: crisp(Y(t)), label: fmtY(t), v: t }));
    const xt = tickIndices(rows.length, narrow ? 3 : w < 900 ? 5 : 7).map((i) => ({ i, x: X(i), label: monthYear(rows[i].date) }));
    const first = rows[0], last = rows[rows.length - 1];
    const lastV = mode === "value" ? last.value ?? 0 : last.idx;
    return {
      rows, X, Y, padR, padT, bottom, iw, main, area: close(main), contrib, contribArea: contrib ? close(contrib) : "",
      grid, xt, ref100: mode === "index" ? crisp(Y(100)) : null, change: last.idx / first.idx - 1,
      lastPt: mainPts[mainPts.length - 1], lastLabel: mode === "value" ? money(lastV, currency) : lastV.toFixed(1),
    };
  }, [perf, range, mode, currency, w, h]);

  // Choreography: the line draws left → right, scrubbed while the chart crosses the viewport; a champagne dot rides
  // its leading edge with the value at that point updating live; the area, deposits and the end tag fade in last.
  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const path = el.querySelector<SVGPathElement>("[data-draw]");
    const rider = el.querySelector<SVGGElement>("[data-rider]");
    const tag = el.querySelector<HTMLElement>("[data-rider-tag]");
    if (!path || !rider || !tag) return;
    const len = path.getTotalLength();
    const n = v.rows.length, x0 = v.X(0), x1 = v.X(n - 1);
    const valueAt = (x: number) => {
      const f = Math.max(0, Math.min(n - 1, ((x - x0) / Math.max(1, x1 - x0)) * (n - 1)));
      const i = Math.min(n - 2, Math.floor(f)), t = f - i;
      const a = v.rows[i], b = v.rows[Math.min(n - 1, i + 1)];
      return mode === "value" ? money((a.value ?? 0) + ((b.value ?? 0) - (a.value ?? 0)) * t, currency) : (a.idx + (b.idx - a.idx) * t).toFixed(1);
    };
    const st = { p: 0 };
    const place = () => {
      const pt = path.getPointAtLength(st.p * len);
      rider.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      tag.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) translate(-50%, -150%)`;
      tag.textContent = valueAt(pt.x);
      const done = st.p > 0.995;
      rider.style.opacity = done ? "0" : "1"; tag.style.opacity = done ? "0" : "1";
    };
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 40%", scrub: 0.6, invalidateOnRefresh: true } })
      .fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0)
      .fromTo(st, { p: 0 }, { p: 1, duration: 1, onUpdate: place }, 0)
      .fromTo(el.querySelectorAll("[data-fade]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.02 }, 0.75);
    place();
  }, { scope: root, dependencies: [range, mode, w, h], revertOnUpdate: true });

  const hp = hover >= 0 ? v.rows[hover] : null;
  const hx = hp ? v.X(hover) : 0;
  const hy = hp ? v.Y(mode === "value" ? hp.value ?? 0 : hp.idx) : 0;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / v.iw)) * (v.rows.length - 1)));
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, Math.min(v.rows.length - 1, (h < 0 ? v.rows.length - 1 : h) + (e.key === "ArrowRight" ? 1 : -1)))); }
  };
  const tipSide = hx / w > 0.68 ? "-104%" : hx / w < 0.25 ? "4%" : "-50%";
  // hide axis labels the latest-value tag would sit on
  const tagY = Math.max(v.padT, Math.min(v.bottom, v.lastPt[1]));

  return (
    <div ref={root} className="glass flex flex-col gap-6 rounded-[28px] p-5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5 text-[11px] uppercase tracking-[0.18em] text-graphite-2">
          {amounts && (
            <div role="group" aria-label="Chart mode" className="flex gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06]">
              {(["value", "index"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setHover(-1); }}
                  className={`h-9 rounded-full px-4 text-[11px] uppercase tracking-[0.14em] transition-colors ${mode === m ? "bg-graphite text-pearl" : "text-mute hover:text-graphite"}`}>
                  {m === "value" ? "Value vs deposits" : "Returns only"}
                </button>
              ))}
            </div>
          )}
          {mode === "value" ? (
            <>
              <span className="flex items-center gap-2"><svg width="20" height="8" aria-hidden><path d="M1 4h18" stroke="#d9c09b" strokeWidth="2" strokeLinecap="round" /></svg>Portfolio value</span>
              <span className="flex items-center gap-2"><svg width="20" height="8" aria-hidden><path d="M1 4h18" stroke="#f3f2ed" strokeOpacity=".6" strokeWidth="1.25" strokeDasharray="3 3" /></svg>Net deposits</span>
            </>
          ) : (
            <span className="flex items-center gap-2"><svg width="20" height="8" aria-hidden><path d="M1 4h18" stroke="#d9c09b" strokeWidth="2" strokeLinecap="round" /></svg>Growth of 100, time-weighted</span>
          )}
          <span className={`tnum rounded-full px-2.5 py-1 ring-1 ring-inset ${v.change >= 0 ? "text-gain ring-gain/30" : "text-loss ring-loss/30"}`}>{pct(v.change, true)} · {range}</span>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06]">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={range === k} onClick={() => { setRange(k); setHover(-1); }}
              className={`tnum h-9 min-w-12 rounded-full px-3 text-[11px] tracking-[0.12em] transition-colors ${range === k ? "bg-graphite text-pearl" : "text-mute hover:text-graphite"}`}>{k}</button>
          ))}
        </div>
      </div>

      <div ref={plot} tabIndex={0} role="img" onPointerMove={move} onPointerLeave={() => setHover(-1)} onKeyDown={key} onBlur={() => setHover(-1)}
        aria-label={`${mode === "value" ? "Portfolio value against net deposits" : "Time-weighted growth of 100"} over ${range}: ${pct(v.change, true)} time-weighted. Use arrow keys to inspect months.`}
        className="relative h-[300px] cursor-crosshair select-none md:h-[420px]">
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="absolute inset-0 overflow-visible" shapeRendering="geometricPrecision">
          <defs>
            <linearGradient id={`${uid}l`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f3f2ed" stopOpacity="0.85" /><stop offset="0.55" stopColor="#e8d9c2" /><stop offset="1" stopColor="#d9c09b" /></linearGradient>
            <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9c09b" stopOpacity="0.20" /><stop offset="0.7" stopColor="#d9c09b" stopOpacity="0.03" /><stop offset="1" stopColor="#d9c09b" stopOpacity="0" /></linearGradient>
          </defs>
          {v.grid.map((g) => <path key={g.v} d={`M0 ${g.y}H${w - v.padR + 8}`} stroke="#f3f2ed" strokeOpacity={g.v === 0 ? 0.16 : 0.07} strokeWidth={1} shapeRendering="crispEdges" />)}
          {v.xt.map((t) => <path key={t.i} d={`M${Math.round(t.x) + 0.5} ${v.bottom}v5`} stroke="#f3f2ed" strokeOpacity={0.25} shapeRendering="crispEdges" />)}
          {v.ref100 != null && <path d={`M0 ${v.ref100}H${w - v.padR + 8}`} stroke="#f3f2ed" strokeOpacity={0.3} strokeDasharray="2 4" shapeRendering="crispEdges" />}
          {mode === "value" && <path data-fade d={v.contribArea} fill="#f3f2ed" fillOpacity={0.045} />}
          {mode === "value" && <path data-fade d={v.contrib} fill="none" stroke="#f3f2ed" strokeOpacity={0.55} strokeWidth={1.25} strokeDasharray="3 4" strokeLinejoin="round" />}
          <path data-fade d={v.area} fill={`url(#${uid}f)`} />
          <path data-fade d={v.main} fill="none" stroke="#d9c09b" strokeOpacity={0.14} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
          <path data-draw d={v.main} fill="none" stroke={`url(#${uid}l)`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" />
          <g data-rider aria-hidden style={{ opacity: 0 }}>
            <circle r={14} fill="#d9c09b" fillOpacity={0.14} />
            <circle r={4} fill="#d9c09b" stroke="#08090a" strokeWidth={1.5} />
          </g>
          <g data-fade>
            <circle cx={v.lastPt[0]} cy={v.lastPt[1]} r={9} fill="#d9c09b" fillOpacity={0.14} />
            <circle cx={v.lastPt[0]} cy={v.lastPt[1]} r={3.5} fill="#d9c09b" stroke="#08090a" strokeWidth={1.5} />
          </g>
          {hp && (
            <>
              <path d={`M${Math.round(hx) + 0.5} ${v.padT}V${v.bottom}`} stroke="#f3f2ed" strokeOpacity={0.28} shapeRendering="crispEdges" />
              <path d={`M0 ${Math.round(hy) + 0.5}H${w - v.padR + 8}`} stroke="#f3f2ed" strokeOpacity={0.12} strokeDasharray="2 3" shapeRendering="crispEdges" />
              <circle cx={hx} cy={hy} r={6} fill="#08090a" stroke="#d9c09b" strokeWidth={2} />
            </>
          )}
        </svg>
        {v.grid.map((g) => (
          <span key={g.v} aria-hidden className={`tnum absolute right-0 -translate-y-1/2 text-[11px] tracking-[0.04em] text-mute transition-opacity ${Math.abs(g.y - tagY) < 16 ? "opacity-0" : ""}`}
            style={{ top: g.y }}>{g.label}</span>
        ))}
        <span data-rider-tag aria-hidden className="tnum pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-ice-deep/40 bg-pearl/80 px-2.5 py-1 text-[11px] text-ice-deep opacity-0 backdrop-blur-sm" />
        <span data-fade aria-hidden className="tnum absolute right-0 -translate-y-1/2 rounded-full bg-lime px-2 py-[3px] text-[11px] font-medium leading-none text-pearl" style={{ top: tagY }}>{v.lastLabel}</span>
        {v.xt.map((t, k) => (
          <span key={t.i} aria-hidden className={`tnum absolute whitespace-nowrap text-[11px] tracking-[0.04em] text-mute ${k === 0 ? "" : k === v.xt.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: t.x, top: v.bottom + 10 }}>{t.label}</span>
        ))}
        {hp && (
          <span aria-live="polite" className="glass tnum pointer-events-none absolute top-2 flex flex-col gap-1 whitespace-nowrap rounded-2xl px-4 py-3 text-xs"
            style={{ left: hx, transform: `translateX(${tipSide})` }}>
            <span className="label">{monthYear(hp.date)}</span>
            {mode === "value" && hp.value != null && hp.contrib != null ? (
              <>
                <span className="font-serif text-[24px] leading-tight">{money(hp.value, currency)}</span>
                <span className="text-graphite-2">Deposited {money(hp.contrib, currency)}</span>
                <span className={hp.value - hp.contrib > 0 ? "text-gain" : hp.value - hp.contrib < 0 ? "text-loss" : "text-graphite-2"}>Market gain {money(hp.value - hp.contrib, currency)}</span>
              </>
            ) : (
              <span className="font-serif text-[24px] leading-tight">{hp.idx.toFixed(1)}</span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

const ZERO = 0.0005; // |r| below 0.05% prints as 0.0% and is shown as neutral
const tone = (r: number) => (r > ZERO ? "text-gain" : r < -ZERO ? "text-loss" : "text-graphite-2");

function cellStyle(r: number): React.CSSProperties {
  if (Math.abs(r) < ZERO) return { background: "rgba(243,242,237,0.05)", color: "#c8c9c3" };
  const a = Math.min(1, Math.abs(r) / 0.1);
  const alpha = 0.14 + a * 0.72;
  const strong = alpha > 0.5; // dark ink on bright cells keeps contrast above 7:1
  return r > 0
    ? { background: `rgba(217,192,155,${alpha.toFixed(3)})`, color: strong ? "#08090a" : "#f3f2ed" }
    : { background: `rgba(217,154,145,${(alpha * 0.85).toFixed(3)})`, color: strong ? "#08090a" : "#f3f2ed" };
}

/** Monthly returns. Choreography: rows fade in one by one as they enter; each month's cell starts neutral and tints to
 *  its gain/loss colour in sequence, so the year reads left to right. */
function Heatmap({ perf }: { perf: Perf }) {
  const years = perf.yearly.map((y) => y.year);
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!root.current || reducedMotion()) return;
    gsap.utils.toArray<HTMLElement>("tbody tr, thead tr", root.current).forEach((tr) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: tr, start: "top 92%", once: true } });
      tl.from(tr, { autoAlpha: 0, y: 14, duration: 0.9, ease: "expo.out" })
        .from(tr.querySelectorAll("td[data-r]"), { backgroundColor: "rgba(243,242,237,0.05)", color: "#c8c9c3", duration: 0.7, ease: "power2.out", stagger: 0.05 }, 0.15);
    });
  }, { scope: root });
  const byKey = new Map(perf.monthly.map((m) => [m.date.slice(0, 7), m.r]));
  return (
    <div ref={root} className="glass overflow-x-auto rounded-[28px] p-5 md:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h3 className="label">Monthly returns</h3>
        <span aria-hidden className="tnum flex items-center gap-2 text-[10px] tracking-[0.08em] text-mute">
          −10%
          <span className="h-2 w-28 rounded-full bg-[linear-gradient(90deg,rgba(217,154,145,.73),rgba(217,154,145,.12)_45%,rgba(243,242,237,.08)_50%,rgba(217,192,155,.14)_55%,rgba(217,192,155,.86))]" />
          +10%
        </span>
      </div>
      <table className="tnum w-full min-w-[760px] table-fixed border-separate border-spacing-1 text-center text-[12px]">
        <caption className="sr-only">Monthly time-weighted returns by year</caption>
        <colgroup><col className="w-16" />{Array.from({ length: 12 }, (_, i) => <col key={i} />)}<col className="w-20" /></colgroup>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.14em]">
            <th scope="col" className="pb-1 text-left font-normal text-mute">Year</th>
            {Array.from({ length: 12 }, (_, i) => <th key={i} scope="col" className="pb-1 font-normal text-graphite-2">{monthName(i)}</th>)}
            <th scope="col" className="pb-1 font-medium text-graphite">Total</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => {
            const yr = perf.yearly.find((x) => x.year === y)!.r;
            return (
              <tr key={y}>
                <th scope="row" className="text-left text-[13px] font-normal text-graphite-2">{y}</th>
                {Array.from({ length: 12 }, (_, m) => {
                  const r = byKey.get(`${y}-${String(m + 1).padStart(2, "0")}`);
                  return r == null
                    ? <td key={m} className="h-11 rounded-[10px] ring-1 ring-inset ring-white/[0.04]"><span className="sr-only">No data</span></td>
                    : <td key={m} data-r className="h-11 rounded-[10px] font-medium ring-1 ring-inset ring-white/[0.06]" style={cellStyle(r)}>{pct(r, true)}</td>;
                })}
                <td className={`h-11 rounded-[10px] bg-white/[0.03] text-[13px] font-medium ring-1 ring-inset ring-white/[0.08] ${tone(yr)}`}>{pct(yr, true)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YearBars({ perf }: { perf: Perf }) {
  const root = useRef<HTMLDivElement>(null);
  const { hi, ticks } = niceTicks(0, Math.max(...perf.yearly.map((y) => Math.abs(y.r)), 0.01), 2);
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-yb]", { scaleY: 0, ease: "none", stagger: 0.12, scrollTrigger: { trigger: root.current, start: "top 85%", end: "center 50%", scrub: 0.6 } });
  }, { scope: root });
  const H = 40; // % of the plot each half may use; leaves room for the value label
  const at = (v: number) => `${50 - (v / hi) * H}%`;
  const lines = [...ticks.filter((t) => t > 0).flatMap((t) => [t, -t]), 0];
  return (
    <div ref={root} className="glass flex flex-col gap-6 rounded-[28px] p-5 md:p-8">
      <h3 className="label">Yearly returns</h3>
      <div className="flex flex-col gap-3">
        <div className="relative h-[230px] pl-12" role="img" aria-label={perf.yearly.map((y) => `${y.year} ${pct(y.r, true)}`).join(", ")}>
          {lines.map((t) => (
            <div key={t} aria-hidden className="absolute inset-x-0 flex h-0 items-center" style={{ top: at(t) }}>
              <span className="tnum w-12 pr-3 text-right text-[10px] leading-none text-mute">{t === 0 ? "0%" : pct(t, true, 0)}</span>
              <span className={`h-px flex-1 ${t === 0 ? "bg-graphite/30" : "bg-graphite/[0.07]"}`} />
            </div>
          ))}
          <div className="relative flex h-full gap-3">
            {perf.yearly.map((y) => {
              const hgt = `${(Math.abs(y.r) / hi) * H}%`;
              const pos = y.r >= 0;
              return (
                <div key={y.year} className="relative h-full flex-1">
                  <span data-yb className={`absolute left-1/2 w-[56%] max-w-16 -translate-x-1/2 ring-1 ring-inset ring-white/10 ${pos ? "origin-bottom rounded-t-[6px] bg-gradient-to-t from-[#6f6252] to-[#d9c09b]" : "origin-top rounded-b-[6px] bg-gradient-to-b from-[#5e3f3b] to-[#d99a91]"}`}
                    style={pos ? { bottom: "50%", height: hgt } : { top: "50%", height: hgt }} />
                  <span className={`tnum absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] font-medium ${tone(y.r)}`}
                    style={pos ? { bottom: `calc(50% + ${hgt} + 6px)` } : { top: `calc(50% + ${hgt} + 6px)` }}>{pct(y.r, true)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div aria-hidden className="flex gap-3 pl-12">
          {perf.yearly.map((y) => <span key={y.year} className="tnum flex-1 text-center text-[11px] tracking-[0.08em] text-graphite-2">{y.year}</span>)}
        </div>
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
    gsap.from("[data-hb]", { scaleX: 0, ease: "none", stagger: 0.1, scrollTrigger: { trigger: root.current, start: "top 85%", end: "center 50%", scrub: 0.6 } });
  }, { scope: root });
  if (!rows.length) return null;
  const hasNeg = rows.some((h) => h.returnPct! < 0);
  const hasPos = rows.some((h) => h.returnPct! > 0);
  const centred = hasNeg && hasPos;
  // zero sits at the centre when returns go both ways, otherwise at the edge the bars grow from
  const zero = centred ? 50 : hasNeg ? 100 : 0;
  return (
    <div ref={root} className="glass flex flex-col gap-5 rounded-[28px] p-5 md:p-8">
      <h3 className="label">Return by investment, since purchase</h3>
      <ul className="flex flex-col gap-1">
        {rows.map((h) => {
          const r = h.returnPct!;
          const w = (Math.abs(r) / max) * (centred ? 50 : 100);
          return (
            <li key={h.id}>
              <Link href={`/investments/${h.id}`} data-cursor="View" className="group grid grid-cols-[minmax(120px,1.1fr)_minmax(0,2fr)_72px] items-center gap-4 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
                <span className="truncate text-[14px] group-hover:text-lavender-deep">{h.name}</span>
                <span className="relative h-2.5 rounded-full bg-white/[0.05]">
                  <span aria-hidden className="absolute -inset-y-1 w-px bg-graphite/25" style={{ left: `calc(${zero}% - ${zero === 100 ? 1 : 0}px)` }} />
                  {Math.abs(r) >= ZERO && (
                    <span data-hb className={`absolute top-0 h-full rounded-full ${r > 0 ? "origin-left bg-gradient-to-r from-[#6f6252] to-[#d9c09b]" : "origin-right bg-gradient-to-l from-[#5e3f3b] to-[#d99a91]"}`}
                      style={r > 0 ? { left: `${zero}%`, width: `${w}%` } : { right: `${100 - zero}%`, width: `${w}%` }} />
                  )}
                </span>
                <span className={`tnum text-right text-[14px] ${tone(r)}`}>{pct(r, true)}</span>
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
      <Assemble as="dl" className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden rounded-[28px] bg-white/[0.06]">
        {kpis.map((k) => (
          <div key={k.label} data-tile className="flex flex-col gap-2 bg-[#0e1012] p-6">
            <dt className="label">{k.label}</dt>
            <dd className={`tnum font-serif text-[clamp(26px,2.4vw,34px)] leading-none ${k.tone > 0 ? "text-gain" : k.tone < 0 ? "text-loss" : ""}`}>{k.v}</dd>
          </div>
        ))}
      </Assemble>
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
