"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { PublicHolding } from "@/lib/public";
import { moneyCompact, pct } from "@/lib/format";
import { classColor } from "@/lib/palette";

/** the brand on a card: set in data/holdings.json, else the first word of the name ("NVIDIA Corp" → "NVIDIA") */
const brandOf = (h: PublicHolding) => (h.brand ?? h.name.replace(/[^\p{L}\p{N}\s&.-]/gu, " ").trim().split(/\s+/)[0] ?? h.name).trim();
const initialOf = (brand: string) => (brand.match(/\p{L}|\p{N}/u)?.[0] ?? "·").toUpperCase();

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

  const color = h.accent ?? classColor(h.assetClass);
  const brand = brandOf(h);
  const listed = h.assetClass === "Stocks" || h.assetClass === "ETFs";
  return (
    <Link ref={ref} href={`/investments/${h.id}`} data-cursor="View" data-card
      className={`group relative flex h-full min-h-[390px] flex-col overflow-hidden rounded-[22px] border transition-[border-color,box-shadow] duration-700 border-ice-deep/15 bg-[#111315] hover:border-ice-deep/45 hover:shadow-[0_32px_90px_-42px_rgba(217,192,155,.28)]`}>
      <>
          <div ref={art} data-art className="pointer-events-none absolute -inset-4 overflow-hidden">
            <div className={`absolute inset-0 ${h.id === "alphabet" ? "bg-[radial-gradient(ellipse_at_78%_28%,rgba(66,133,244,.18),transparent_34%),radial-gradient(ellipse_at_22%_82%,rgba(52,168,83,.10),transparent_42%),linear-gradient(135deg,#15191e_0%,#101214_60%,#0b0d0f_100%)]" : h.id === "anthropic" ? "bg-[radial-gradient(ellipse_at_78%_25%,rgba(217,154,116,.18),transparent_38%),linear-gradient(135deg,#211915_0%,#141211_60%,#0b0d0f_100%)]" : "bg-[linear-gradient(135deg,#17191a_0%,#101214_58%,#0b0d0f_100%)]"}`} style={h.id === "alphabet" || h.id === "anthropic" ? undefined : { backgroundImage: `radial-gradient(ellipse at 82% 18%, ${color}30, transparent 44%), linear-gradient(135deg,#17191a 0%,#101214 58%,#0b0d0f 100%)` }} />
            <div className="absolute inset-y-0 right-0 w-[42%] border-l border-white/[.045] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.025))]" />
            {h.id === "alphabet" ? (
              <div className="absolute right-5 top-7 flex h-28 w-28 items-center justify-center select-none opacity-95 transition-transform duration-700 group-hover:scale-105 sm:right-7 sm:h-32 sm:w-32" aria-hidden="true">
                <span className="relative block font-sans text-[112px] font-semibold leading-none tracking-[-.12em] text-[#4285F4]">G
                  <span className="absolute inset-0 text-[#EA4335] [clip-path:polygon(0_0,100%_0,100%_43%,0_43%)]">G</span>
                  <span className="absolute inset-0 text-[#FBBC05] [clip-path:polygon(48%_0,100%_0,100%_55%,48%_55%)]">G</span>
                  <span className="absolute inset-0 text-[#34A853] [clip-path:polygon(0_48%,48%_48%,48%_100%,0_100%)]">G</span>
                </span>
              </div>
            ) : h.id === "anthropic" ? (
              <div className="absolute right-9 top-10 flex h-32 w-32 items-center justify-center opacity-80 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-105">
                <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" aria-hidden="true">
                  {Array.from({ length: 16 }, (_, n) => <path key={n} d="M50 8 L54 42 L50 50 L46 42 Z" fill="#D99A74" transform={`rotate(${n * 22.5} 50 50)`} />)}
                  <circle cx="50" cy="50" r="5" fill="#E8C3A8" />
                </svg>
              </div>
            ) : listed ? (
              <div className="absolute right-8 top-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[.025] font-serif text-[76px] italic tracking-[-.1em] text-white/75 transition-transform duration-700 group-hover:rotate-[-8deg] group-hover:scale-105">
                <span className="translate-x-[-3px]">{initialOf(brand)}</span><span className="absolute right-5 top-5 h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}aa` }} />
              </div>
            ) : h.assetClass === "Cash" ? (
              <div className="absolute -right-1 top-2 select-none font-serif text-[clamp(150px,19vw,230px)] font-light italic leading-none tracking-[-.1em] text-white/[.12] transition-transform duration-700 group-hover:-translate-y-2">€</div>
            ) : h.assetClass === "Cryptocurrency" ? (
              <div className="absolute right-8 top-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[.025] font-sans text-[72px] font-light text-white/70 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-105">₿</div>
            ) : h.assetClass === "Real Estate" ? (
              <svg viewBox="0 0 160 160" className="absolute right-7 top-7 h-32 w-32 text-white/65 transition-transform duration-700 group-hover:-translate-y-2" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
                <path d="M22 138V54L80 20L138 54V138H22Z M48 138V78H112V138 M65 78V98H95V78 M58 49H102 M80 20V138" opacity=".75" />
                <path d="M12 138H148 M35 54L80 8L125 54" stroke={color} />
              </svg>
            ) : h.assetClass === "Bonds" ? (
              <div className="absolute right-8 top-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 text-[68px] font-light text-white/65 transition-transform duration-700 group-hover:scale-105">§</div>
            ) : h.assetClass === "Precious Metals" ? (
              <div className="absolute right-8 top-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[.025] font-serif text-[72px] italic text-white/70 transition-transform duration-700 group-hover:rotate-[-8deg] group-hover:scale-105">Au</div>
            ) : (
              <div className="absolute -right-5 top-7 select-none font-serif text-[clamp(150px,20vw,250px)] italic leading-[.8] tracking-[-.09em] text-white/[.14] transition-transform duration-700 group-hover:-translate-x-2">{(h.ticker ?? h.name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 4)).slice(0, 4)}</div>
            )}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d9c09b]/50 to-transparent" />
            <div className="absolute bottom-[34%] left-8 right-8 h-px bg-white/[.07]" />
          </div>
          <div className="relative flex flex-1 flex-col p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow flex items-center gap-3 text-[#d9c09b]/80"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}99` }} /> {h.assetClass} position</span>
              <span className="font-mono text-[10px] tracking-[.18em] text-white/35">NO. {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-10 flex items-end justify-between gap-4">
              <div className="min-w-0">
                {h.id === "alphabet" ? (
                  <p className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/[.06] font-sans text-[15px] font-semibold text-[#4285F4]">G</span>
                    <span className="font-sans text-[19px] font-medium tracking-[-.055em] text-white/90">Google</span>
                    <span className="ml-1 border-l border-white/15 pl-3 font-mono text-[8px] uppercase tracking-[.17em] text-white/35">Alphabet · Class C</span>
                  </p>
                ) : h.id === "anthropic" ? (
                  <p className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#D99A74]/35 bg-[#D99A74]/10 font-serif text-[16px] text-[#E8C3A8]">A</span>
                    <span className="font-sans text-[16px] font-medium tracking-[.12em] text-[#E8C3A8]">ANTHROPIC</span>
                  </p>
                ) : listed ? (
                  <p className="mb-2 flex items-center gap-2 font-sans text-[13px] font-semibold tracking-[.12em] text-white/85">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-[13px]" style={h.accent ? { borderColor: `${color}66`, color } : undefined}>{initialOf(brand)}</span>
                    {brand.toUpperCase()}
                    {h.assetClass === "ETFs" && <span className="font-mono text-[8px] font-normal tracking-[.16em] text-white/35">FUND POSITION</span>}
                  </p>
                ) : h.assetClass === "Cash" ? (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">LIQUID RESERVE · {h.currency}</p>
                ) : h.assetClass === "Cryptocurrency" ? (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">DIGITAL ASSET</p>
                ) : h.assetClass === "Real Estate" ? (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">PROPERTY HOLDING</p>
                ) : h.assetClass === "Bonds" ? (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">FIXED INCOME</p>
                ) : h.assetClass === "Precious Metals" ? (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">PRECIOUS METAL</p>
                ) : (
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[.22em] text-white/55">{h.assetClass.toUpperCase()}</p>
                )}
                <p className="font-mono text-[12px] tracking-[.24em] text-[#d9c09b]">{h.ticker ?? h.assetClass.toUpperCase()}</p>
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
    </Link>
  );
}

/**
 * INVESTMENTS — the positions as a gallery you walk past.
 * Desktop: a sticky horizontal track. The section is exactly as tall as the track is wide (plus the stage), so
 * vertical scroll slides the cards sideways (scrubbed); each card tilts slightly by its position on screen
 * (rotateY ±4°, towards the centre) and its artwork parallaxes inside the frame, with a progress hairline.
 * The cards arrive in a staggered rise. Phones/tablets: a grid whose cards clip-reveal and rise in sequence.
 * Reduced motion: a plain grid.
 */
export default function Investments({ holdings, currency }: { holdings: PublicHolding[]; currency: string }) {
  const classes = useMemo(() => [...new Set(holdings.map((h) => h.assetClass))], [holdings]);
  const [filter, setFilter] = useState<string>("All");
  const grid = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const on = (e: Event) => { const k = (e as CustomEvent<string>).detail; setFilter(classes.includes(k as PublicHolding["assetClass"]) ? k : "All"); };
    window.addEventListener("filter:class", on);
    return () => window.removeEventListener("filter:class", on);
  }, [classes]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const track = grid.current!, wrap = outer.current!, stage = wrap.firstElementChild as HTMLElement;
      const distance = () => Math.max(0, track.scrollWidth - stage.clientWidth);
      const size = () => { wrap.style.height = `${stage.offsetHeight + distance()}px`; };
      size();
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", track);
      const arts = gsap.utils.toArray<HTMLElement>("[data-art]", track);
      const tilt = () => {
        const vw = window.innerWidth;
        cards.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const off = gsap.utils.clamp(-1, 1, (r.left + r.width / 2 - vw / 2) / (vw / 2));
          gsap.set(c, { rotateY: -off * 4, transformPerspective: 1400 });
          if (arts[i]) gsap.set(arts[i], { xPercent: off * -6 });
        });
      };
      gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: wrap, start: "top 12%", end: () => `+=${distance()}`, scrub: 0.8, invalidateOnRefresh: true, onRefreshInit: size,
          onUpdate: (st) => { if (bar.current) bar.current.style.transform = `scaleX(${st.progress})`; tilt(); } },
      });
      tilt();
      gsap.fromTo(cards, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.09, scrollTrigger: { trigger: wrap, start: "top 85%", once: true } });
      return () => { wrap.style.height = ""; };
    });
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-card]", grid.current!).forEach((c) => {
        gsap.timeline({ scrollTrigger: { trigger: c, start: "top 90%", once: true } })
          .fromTo(c, { clipPath: "inset(100% 0% 0% 0%)", y: 40 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.3, ease: "power4.inOut" })
          .fromTo(c.querySelector("[data-art]"), { scale: 1.2 }, { scale: 1, duration: 1.6, ease: "expo.out" }, 0.1);
      });
    });
    return () => mm.revert();
  }, { scope: pin, dependencies: [filter], revertOnUpdate: true });

  const shown = filter === "All" ? holdings : holdings.filter((h) => h.assetClass === filter);
  return (
    <div ref={pin} className="flex flex-col gap-10 py-2">
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
      <div ref={outer} className="relative">
        <div className="motion-safe:lg:sticky motion-safe:lg:top-[12svh] motion-safe:lg:overflow-hidden">
          <div ref={grid} className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 motion-safe:lg:flex motion-safe:lg:w-max motion-safe:lg:gap-8 motion-safe:lg:pb-6 motion-safe:lg:pr-[8vw]" aria-live="polite">
            <div aria-hidden className="hidden w-[min(420px,30vw)] shrink-0 flex-col justify-between rounded-[24px] border border-line p-8 motion-safe:lg:flex">
              <span className="eyebrow text-mute">Portfolio · {shown.length} {shown.length === 1 ? "position" : "positions"}</span>
              <span className="display text-[clamp(56px,5vw,88px)] leading-[0.9]">Keep<br /><em className="iris-text">walking</em></span>
              <svg width="64" height="16" viewBox="0 0 64 16" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-ice-deep"><path d="M0 8h62M54 1l8 7-8 7" /></svg>
            </div>
            {shown.map((h, i) => (
              <div key={h.id} className="motion-safe:lg:w-[min(440px,32vw)] motion-safe:lg:shrink-0">
                <Card h={h} i={i} cur={currency} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
