"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { portfolio, valueOf } from "@/content/portfolio";
import { moneyCompact } from "@/lib/format";

export const PALETTE = ["#B9A477", "#F2F0E9", "#A4A6A8", "#7C7466", "#5A5C5F", "#D8D2C2", "#3A3D41", "#8D8F91"];
const R = 90, C = 2 * Math.PI * R;

export function AllocationDonut() {
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const invs = portfolio.investments;

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-seg]", { strokeDasharray: `0 ${C}`, duration: 1.6, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: root.current, start: "top 85%", once: true } });
  }, { scope: root });

  let acc = 0;
  const segs = invs.map((inv, i) => {
    const len = (inv.allocation / 100) * C;
    const s = { inv, i, dash: `${Math.max(0, len - 2).toFixed(2)} ${C.toFixed(2)}`, off: (-acc).toFixed(2) };
    acc += len;
    return s;
  });
  const cur = active >= 0 ? invs[active] : null;

  return (
    <div ref={root} className="flex flex-col gap-6 border border-line p-5 md:p-7">
      <h3 className="label">Asset allocation</h3>
      <div className="flex flex-wrap items-center gap-7">
        <div className="relative h-[220px] w-[220px] shrink-0">
          <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" role="img" aria-label={`Asset allocation: ${invs.map((v) => `${v.category} ${v.allocation}%`).join(", ")}`}>
            {segs.map((s) => (
              <circle key={s.inv.slug} data-seg cx="110" cy="110" r={R} fill="none" stroke={PALETTE[s.i]} strokeWidth={active === s.i ? 22 : 12}
                strokeDasharray={s.dash} strokeDashoffset={s.off} className="transition-[stroke-width] duration-300" />
            ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="tnum font-serif text-[40px] leading-none">{cur ? `${cur.allocation}%` : invs.length}</span>
            <span className="max-w-[120px] text-[10px] tracking-[0.16em] text-silver">{cur ? moneyCompact(valueOf(cur)).toUpperCase() : "ASSET CLASSES"}</span>
          </span>
        </div>
        <ul className="flex min-w-[200px] flex-1 flex-col">
          {segs.map((s) => (
            <li key={s.inv.slug}>
              <Link href={`/portfolio/${s.inv.slug}`} onPointerEnter={() => setActive(s.i)} onPointerLeave={() => setActive(-1)} onFocus={() => setActive(s.i)} onBlur={() => setActive(-1)}
                className={`flex min-h-9 items-center gap-3 border-b border-[#1a1c1f] text-[13px] transition-colors ${active === -1 || active === s.i ? "text-ivory" : "text-mute"}`}>
                <span className="h-2 w-2" style={{ background: PALETTE[s.i] }} />
                <span className="flex-1">{s.inv.category}</span>
                <span className="tnum">{s.inv.allocation.toFixed(1)}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Exposure() {
  const root = useRef<HTMLDivElement>(null);
  const maxGeo = Math.max(...portfolio.geography.map((g) => g.pct));
  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from("[data-bar]", { scaleX: 0, transformOrigin: "left center", duration: 1.6, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: root.current, start: "top 85%", once: true } });
  }, { scope: root });
  return (
    <div ref={root} className="flex flex-col gap-5 border border-line p-5 md:p-7">
      <h3 className="label">Geographic exposure</h3>
      <ul className="flex flex-col gap-5">
        {portfolio.geography.map((g, i) => (
          <li key={g.name} className="flex flex-col gap-2.5">
            <span className="flex justify-between text-[13px]"><span>{g.name}</span><span className="tnum text-silver">{g.pct}%</span></span>
            <span className="block h-0.5 bg-[#1a1c1f]"><span data-bar className="block h-0.5" style={{ width: `${(g.pct / maxGeo) * 100}%`, background: i === 0 ? "#B9A477" : "#A4A6A8" }} /></span>
          </li>
        ))}
      </ul>
      <h3 className="label mt-5">Sector allocation</h3>
      <div className="flex h-9 gap-0.5" role="img" aria-label={`Sector allocation: ${portfolio.sectors.map((s) => `${s.name} ${s.pct}%`).join(", ")}`}>
        {portfolio.sectors.map((s, i) => <span key={s.name} data-bar title={`${s.name} ${s.pct}%`} className="block h-9" style={{ width: `${s.pct}%`, background: PALETTE[i] }} />)}
      </div>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-2">
        {portfolio.sectors.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2.5 text-xs text-ivory-dim">
            <span className="h-2 w-2 shrink-0" style={{ background: PALETTE[i] }} /><span className="flex-1">{s.name}</span><span className="tnum text-silver">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
