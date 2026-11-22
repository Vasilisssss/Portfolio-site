"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { PublicHolding } from "@/lib/public";
import { moneyCompact, pct } from "@/lib/format";
import { classColor } from "@/lib/palette";
import CardArt from "@/components/ui/CardArt";

function Card({ h, i, cur }: { h: PublicHolding; i: number; cur: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set(el, { transformPerspective: 1200 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3" });
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); rx(-((e.clientY - r.top) / r.height - 0.5) * 7); ry(((e.clientX - r.left) / r.width - 0.5) * 9); };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, { scope: ref });

  const color = classColor(h.assetClass);
  return (
    <Link ref={ref} href={`/investments/${h.id}`} data-cursor="View" data-card
      className="glass group flex h-full flex-col overflow-hidden rounded-[24px] transition-shadow duration-500 hover:shadow-[0_40px_80px_-40px_rgba(46,106,153,0.35)]">
      <div className="relative h-[210px] overflow-hidden" style={{ background: `radial-gradient(120% 90% at 70% 10%, ${color}55, transparent 70%)` }}>
        <CardArt assetClass={h.assetClass} seed={i + 1} accent={color === "#e9eef5" ? "var(--color-ice-deep)" : color} className="absolute inset-0 h-full w-full scale-[1.02] transition-transform duration-[1.1s] ease-[var(--ease-expo)] group-hover:scale-[1.1]" />
        <div className="absolute inset-x-5 top-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-snow/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-graphite-2 backdrop-blur"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{h.assetClass}</span>
          {h.ticker && <span className="tnum text-[11px] tracking-[0.2em] text-graphite-2">{h.ticker}</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-6 p-6">
        <h3 className="font-serif text-[28px] leading-[1.05] transition-colors group-hover:text-lavender-deep">{h.name}</h3>
        <dl className="grid grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.18em] text-mute">
          <div className="flex flex-col gap-1.5"><dt>Weight</dt><dd className="tnum text-[15px] normal-case tracking-normal text-graphite">{pct(h.weight)}</dd></div>
          <div className="flex flex-col gap-1.5"><dt>Return</dt><dd className={`tnum text-[15px] normal-case tracking-normal ${h.returnPct == null ? "text-mute" : h.returnPct >= 0 ? "text-gain" : "text-loss"}`}>{h.returnPct == null ? "—" : pct(h.returnPct, true)}</dd></div>
          {h.value != null && <div className="flex flex-col gap-1.5"><dt>Value</dt><dd className="tnum text-[15px] normal-case tracking-normal text-graphite">{moneyCompact(h.value, cur)}</dd></div>}
        </dl>
      </div>
    </Link>
  );
}

export default function Investments({ holdings, currency }: { holdings: PublicHolding[]; currency: string }) {
  const classes = useMemo(() => [...new Set(holdings.map((h) => h.assetClass))], [holdings]);
  const [filter, setFilter] = useState<string>("All");
  const grid = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = (e: Event) => { const k = (e as CustomEvent<string>).detail; setFilter(classes.includes(k as PublicHolding["assetClass"]) ? k : "All"); };
    window.addEventListener("filter:class", on);
    return () => window.removeEventListener("filter:class", on);
  }, [classes]);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo("[data-card]", { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: grid.current, start: "top 88%", once: true } });
  }, { scope: grid, dependencies: [filter], revertOnUpdate: true });

  const shown = filter === "All" ? holdings : holdings.filter((h) => h.assetClass === filter);
  return (
    <div className="flex flex-col gap-10">
      <div role="group" aria-label="Filter by asset class" className="flex flex-wrap gap-2">
        {["All", ...classes].map((c) => (
          <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}
            className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-[11px] uppercase tracking-[0.18em] transition-colors ${filter === c ? "bg-graphite text-snow" : "glass text-graphite-2 hover:text-graphite"}`}>
            {c !== "All" && <span className="h-2 w-2 rounded-full" style={{ background: classColor(c) }} />}
            {c}
            <span className="tnum opacity-60">{c === "All" ? holdings.length : holdings.filter((h) => h.assetClass === c).length}</span>
          </button>
        ))}
      </div>
      <div ref={grid} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
        {shown.map((h, i) => <Card key={h.id} h={h} i={i} cur={currency} />)}
      </div>
    </div>
  );
}
