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
  const art = useRef<HTMLDivElement>(null);
  // Parallax on the artwork only: the card and its text never leave the pixel grid, so type stays razor sharp.
  useGSAP(() => {
    const el = ref.current, layer = art.current;
    if (!el || !layer || !window.matchMedia("(hover: hover) and (pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = gsap.quickTo(layer, "x", { duration: 0.8, ease: "power3" });
    const y = gsap.quickTo(layer, "y", { duration: 0.8, ease: "power3" });
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); x(((e.clientX - r.left) / r.width - 0.5) * 18); y(((e.clientY - r.top) / r.height - 0.5) * 12); };
    const leave = () => { x(0); y(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, { scope: ref });

  const color = classColor(h.assetClass);
  const isStock = h.assetClass === "Stocks";
  return (
    <Link ref={ref} href={`/investments/${h.id}`} data-cursor="View" data-card
      className={`group relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[22px] border transition-all duration-700 ${isStock ? "border-[#d9c09b]/15 bg-[#111315] hover:border-[#d9c09b]/45 hover:shadow-[0_32px_90px_-42px_rgba(217,192,155,.28)]" : "glass border-white/[.08] hover:border-lime/25"}`}>
      {isStock ? (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_82%_18%,rgba(217,192,155,.12),transparent_44%),linear-gradient(135deg,#17191a_0%,#101214_58%,#0b0d0f_100%)]" />
            <div className="absolute inset-y-0 right-0 w-[42%] border-l border-white/[.035] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.018))]" />
            <div className="absolute -right-5 top-7 select-none font-serif text-[clamp(150px,20vw,250px)] font-normal italic leading-[.8] tracking-[-.09em] text-[#d9c09b]/[.075] transition-all duration-700 group-hover:text-[#d9c09b]/[.14]">{(h.ticker ?? h.name.slice(0, 3)).slice(0, 4)}</div>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9c09b]/50 to-transparent" />
            <div className="absolute bottom-[34%] left-8 right-8 h-px bg-white/[.07]" />
          </div>
          <div className="relative flex flex-1 flex-col p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow flex items-center gap-3 text-[#d9c09b]/80"><span className="h-1.5 w-1.5 rounded-full bg-[#d9c09b] shadow-[0_0_12px_rgba(217,192,155,.8)]" /> Equity position</span>
              <span className="font-mono text-[10px] tracking-[.18em] text-white/35">NO. {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-10 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[12px] tracking-[.24em] text-[#d9c09b]">{h.ticker ?? "PUBLIC EQUITY"}</p>
                <h3 className="mt-3 max-w-[13ch] font-serif text-[clamp(30px,3vw,42px)] leading-[.98] tracking-[-.025em] text-[#f0eee8] transition-colors duration-500 group-hover:text-[#e4cda9]">{h.name}</h3>
              </div>
              <span className="mb-1 shrink-0 text-[10px] uppercase tracking-[.18em] text-white/35 transition-transform duration-500 group-hover:translate-x-1">↗</span>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[.09] pt-4 font-mono text-[9px] uppercase tracking-[.16em] text-white/38">
              {h.industry && <span>{h.industry}</span>}
              {h.geography && <span>{h.geography}</span>}
              {!h.industry && !h.geography && <span>Long-term holding</span>}
            </div>
            <div className="mt-auto grid grid-cols-3 gap-3 border-t border-white/[.09] pt-6">
              <div className="flex flex-col gap-2"><span className="label text-white/35">Portfolio weight</span><strong className="tnum text-[clamp(19px,2vw,25px)] font-light tracking-[-.04em] text-[#f0eee8]">{pct(h.weight)}</strong></div>
              <div className="flex flex-col gap-2"><span className="label text-white/35">Total return</span><strong className={`tnum text-[clamp(19px,2vw,25px)] font-light tracking-[-.04em] ${h.returnPct == null ? "text-white/45" : h.returnPct >= 0 ? "text-[#d9c09b]" : "text-[#d99a91]"}`}>{h.returnPct == null ? "—" : pct(h.returnPct, true)}</strong></div>
              {h.value != null && <div className="flex flex-col gap-2"><span className="label text-white/35">Market value</span><strong className="tnum text-[clamp(16px,1.7vw,22px)] font-light tracking-[-.04em] text-[#f0eee8]">{moneyCompact(h.value, cur)}</strong></div>}
            </div>
            <div className="mt-6 flex items-center justify-between text-[9px] uppercase tracking-[.2em] text-[#d9c09b]/55">
              <span>Position details</span><span className="h-px w-12 bg-[#d9c09b]/40 transition-all duration-500 group-hover:w-20" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative h-[210px] overflow-hidden" style={{ background: `radial-gradient(120% 90% at 70% 10%, ${color}55, transparent 70%)` }}>
            <div ref={art} className="absolute -inset-3"><CardArt assetClass={h.assetClass} seed={i + 1} accent={color} className="h-full w-full transition-transform duration-[1.1s] ease-[var(--ease-expo)] group-hover:scale-[1.06]" /></div>
            <div className="absolute inset-x-5 top-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-graphite-2 backdrop-blur"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{h.assetClass}</span>
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
        </>
      )}
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
