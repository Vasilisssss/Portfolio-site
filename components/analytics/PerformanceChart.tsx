"use client";
import { useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { RANGES, type RangeKey, type SeriesPoint } from "@/lib/series";
import { money, moneyCompact, pct, dateLong } from "@/lib/format";

const W = 1000, H = 340;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export default function PerformanceChart({ series }: { series: SeriesPoint[] }) {
  const [range, setRange] = useState<RangeKey>("1Y");
  const [hover, setHover] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  const view = useMemo(() => {
    const L = series.length, n = Math.min(L, RANGES[range]), start = L - n;
    const step = Math.max(1, Math.ceil(n / 180));
    const idx: number[] = [];
    for (let i = start; i < L; i += step) idx.push(i);
    if (idx[idx.length - 1] !== L - 1) idx.push(L - 1);
    const pts = idx.map((i) => ({ t: series[i].t, v: series[i].v, b: (series[i].b / series[start].b) * series[start].v }));
    let mn = Infinity, mx = -Infinity;
    pts.forEach((p) => { mn = Math.min(mn, p.v, p.b); mx = Math.max(mx, p.v, p.b); });
    const pad = (mx - mn) * 0.08 || 1; mn -= pad; mx += pad;
    const X = (i: number) => (i / (pts.length - 1)) * W;
    const Y = (v: number) => 20 + (1 - (v - mn) / (mx - mn)) * 300;
    const line = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join("");
    const bench = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.b).toFixed(1)}`).join("");
    const grid = [0.15, 0.4, 0.65, 0.9].map((g) => { const v = mn + (mx - mn) * g; return { y: Y(v), label: moneyCompact(v) }; });
    return { pts, X, Y, line, bench, area: `${line}L${W} ${H}L0 ${H}Z`, grid, change: pts[pts.length - 1].v / pts[0].v - 1, benchChange: pts[pts.length - 1].b / pts[0].b - 1 };
  }, [series, range]);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo("[data-line]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.8, ease: "power3.inOut", scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
    gsap.fromTo("[data-fill]", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.4, delay: 0.5, scrollTrigger: { trigger: root.current, start: "top 80%", once: true } });
  }, { scope: root, dependencies: [range], revertOnUpdate: true });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHover(Math.round(f * (view.pts.length - 1)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { setHover((h) => Math.min(view.pts.length - 1, (h < 0 ? view.pts.length - 1 : h) + 1)); e.preventDefault(); }
    if (e.key === "ArrowLeft") { setHover((h) => Math.max(0, (h < 0 ? view.pts.length - 1 : h) - 1)); e.preventDefault(); }
  };
  const hp = hover >= 0 ? view.pts[hover] : null;
  const left = hp ? (view.X(hover) / W) * 100 : 0;

  return (
    <div ref={root} className="flex flex-col gap-6 border border-line bg-[#0E1012] p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-[11px] tracking-[0.2em] text-silver">
          <span>PERFORMANCE</span>
          <span className="flex items-center gap-2"><span className="h-px w-[18px] bg-gold" />PORTFOLIO</span>
          <span className="flex items-center gap-2"><span className="w-[18px] border-t border-dashed border-silver" />BENCHMARK</span>
          <span className={`tnum ${view.change >= 0 ? "text-gold" : "text-[#C98B7A]"}`}>{pct(view.change, true)} · {range}</span>
        </div>
        <div role="group" aria-label="Time range" className="flex gap-1 rounded-full border border-[#26292d] p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <button key={k} type="button" aria-pressed={range === k} onClick={() => { setRange(k); setHover(-1); }}
              className={`h-9 min-w-12 rounded-full px-3 text-[11px] tracking-[0.12em] transition-colors duration-300 ${range === k ? "bg-ivory text-ink" : "text-silver hover:text-ivory"}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div
        tabIndex={0}
        role="img"
        aria-label={`Sample portfolio value over ${range}: ${pct(view.change, true)} versus benchmark ${pct(view.benchChange, true)}. Use left and right arrow keys to inspect values.`}
        onPointerMove={onMove} onPointerLeave={() => setHover(-1)} onKeyDown={onKey} onBlur={() => setHover(-1)}
        className="relative h-[300px] cursor-crosshair md:h-[380px]"
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B9A477" stopOpacity="0.22" /><stop offset="1" stopColor="#B9A477" stopOpacity="0" /></linearGradient>
          </defs>
          {view.grid.map((g) => <path key={g.y} d={`M0 ${g.y.toFixed(1)}H${W}`} stroke="#1E2124" vectorEffect="non-scaling-stroke" />)}
          <path data-fill d={view.area} fill="url(#perfFill)" />
          <path d={view.bench} fill="none" stroke="#A4A6A8" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <path data-line d={view.line} fill="none" stroke="#B9A477" strokeWidth={1.5} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" />
        </svg>
        {view.grid.map((g) => (
          <span key={g.label + g.y} aria-hidden className="tnum absolute right-0 -translate-y-[120%] text-[10px] tracking-[0.1em] text-mute" style={{ top: `${(g.y / H) * 100}%` }}>{g.label}</span>
        ))}
        {hp && (
          <>
            <span aria-hidden className="absolute inset-y-0 w-px bg-ivory/25" style={{ left: `${left}%` }} />
            <span aria-hidden className="absolute -ml-[5px] -mt-[5px] h-[9px] w-[9px] rounded-full border border-gold bg-ink" style={{ left: `${left}%`, top: `${(view.Y(hp.v) / H) * 100}%` }} />
            <span className="tnum pointer-events-none absolute top-2 flex flex-col gap-1 whitespace-nowrap bg-ivory px-3.5 py-3 text-xs text-ink"
              style={{ left: `${left}%`, transform: `translateX(${left > 75 ? -105 : left < 25 ? 5 : -50}%)` }} aria-live="polite">
              <span className="text-[10px] tracking-[0.2em] text-[#55585C]">{dateLong(iso(hp.t))}</span>
              <span className="font-serif text-[22px]">{money(hp.v)}</span>
              <span className="text-[#55585C]">Benchmark {money(hp.b)}</span>
            </span>
          </>
        )}
      </div>
      <div className="tnum flex justify-between text-[10px] tracking-[0.16em] text-mute">
        <span>{dateLong(iso(view.pts[0].t))}</span>
        <span className="hidden sm:inline">{dateLong(iso(view.pts[Math.floor(view.pts.length / 2)].t))}</span>
        <span>{dateLong(iso(view.pts[view.pts.length - 1].t))}</span>
      </div>
    </div>
  );
}
