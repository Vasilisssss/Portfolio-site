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
  const pin = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const on = (e: Event) => { const k = (e as CustomEvent<string>).detail; setFilter(classes.includes(k as PublicHolding["assetClass"]) ? k : "All"); };
    window.addEventListener("filter:class", on);
    return () => window.removeEventListener("filter:class", on);
  }, [classes]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    // desktop: pin the gallery and glide the cards sideways while you scroll
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const track = grid.current!, wrap = pin.current!;
      const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth);
      if (distance() < 40) return;
      gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: wrap, start: "top 12%", end: () => `+=${distance()}`, pin: true, pinSpacing: true /* parent is flex: GSAP would default this to false */, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (st) => { if (bar.current) bar.current.style.transform = `scaleX(${st.progress})`; } },
      });
      gsap.fromTo("[data-card]", { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: wrap, start: "top 85%", once: true } });
    });
    // smaller screens: simple rise-in grid
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo("[data-card]", { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: grid.current, start: "top 88%", once: true } });
    });
    return () => mm.revert();
  }, { scope: pin, dependencies: [filter], revertOnUpdate: true });

  const shown = filter === "All" ? holdings : holdings.filter((h) => h.assetClass === filter);
  return (
    <div ref={pin} className="flex flex-col gap-10 py-2 motion-safe:lg:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-6">
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
        <span aria-hidden className="hidden h-px w-56 overflow-hidden bg-line motion-safe:lg:block"><span ref={bar} className="block h-px origin-left scale-x-0 iris-line" /></span>
      </div>
      <div ref={grid} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 motion-safe:lg:flex motion-safe:lg:w-max motion-safe:lg:gap-8 motion-safe:lg:pb-6" aria-live="polite">
        <div aria-hidden className="hidden w-[min(420px,30vw)] shrink-0 flex-col justify-between rounded-[24px] border border-line p-8 motion-safe:lg:flex">
          <span className="eyebrow text-mute">Portfolio · {shown.length} {shown.length === 1 ? "position" : "positions"}</span>
          <span className="display text-[clamp(56px,5vw,88px)] leading-[0.9]">Scroll<br /><em className="iris-text">to explore</em></span>
          <svg width="64" height="16" viewBox="0 0 64 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-ice-deep"><path d="M0 8h62M54 1l8 7-8 7" /></svg>
        </div>
        {shown.map((h, i) => (
          <div key={h.id} className="motion-safe:lg:w-[min(440px,32vw)] motion-safe:lg:shrink-0">
            <Card h={h} i={i} cur={currency} />
          </div>
        ))}
      </div>
    </div>
  );
}
