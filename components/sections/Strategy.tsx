"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import { pad2 } from "@/lib/format";

export interface StrategyContent {
  draft: boolean;
  headline: string[];
  italicFrom: number;
  intro: string;
  principles: { title: string; body: string }[];
}

/** a strategy download; `href` is set only once the file exists */
export interface StrategyDocument { title: string; body: string; format: string; href?: string; size?: string }

/**
 * 05 — STRATEGY. Personal philosophy as a held card stack.
 * Choreography: the manifesto lights up word by word as it crosses the viewport (scrubbed). Then a sticky stage
 * (one viewport, held for ~70svh per principle): the six principles sit in one place; each new card slides up over
 * the previous one (yPercent 115 → 0, expo-like), the card beneath settles back (scale 0.94, dims, lifts 4%), and the
 * big counter on the left rolls to the card's number. Reduced motion: the principles as a plain list.
 * After the deck: the documents (Investment Policy Statement, portfolio model) as download cards that rise in; a
 * document that is not published yet shows "In preparation" and no link.
 */
export default function Strategy({ s, documents = [] }: { s: StrategyContent; documents?: StrategyDocument[] }) {
  const root = useRef<HTMLElement>(null);
  const n = s.principles.length;

  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    gsap.fromTo(q("[data-word]"), { opacity: 0.22 }, {
      opacity: 1, stagger: 0.12, ease: "none",
      scrollTrigger: { trigger: q("[data-manifesto]")[0], start: "top 82%", end: "bottom 40%", scrub: 0.6 },
    });
    if (q("[data-doc]").length) gsap.from(q("[data-doc]"), { y: 32, autoAlpha: 0, duration: 1.1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: q("[data-docs]")[0], start: "top 85%", once: true } });
    gsap.from(q("[data-intro]"), { y: 24, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: q("[data-intro]")[0], start: "top 88%", once: true } });
    const cards = q("[data-card]") as HTMLElement[];
    // waiting cards park just below the screen (measured, so it holds on any viewport)
    const below = (c: HTMLElement) => window.innerHeight - c.getBoundingClientRect().top + 40;
    cards.forEach((c, i) => { if (i > 0) gsap.set(c, { y: () => below(cards[0]) }); });
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: q("[data-deck]")[0], start: "top top", end: "bottom bottom", scrub: 0.8, invalidateOnRefresh: true } });
    for (let i = 1; i < n; i++) {
      const at = i - 1;
      tl.fromTo(cards[i], { y: () => below(cards[0]) }, { y: 0, duration: 0.8, ease: "power3.out", immediateRender: false }, at)
        .to(cards[i - 1], { scale: 0.94, yPercent: -4, opacity: 0.45, duration: 0.8, ease: "power2.out" }, at)
        .to(q("[data-roll]"), { yPercent: -(100 / n) * i, duration: 0.5, ease: "power3.inOut" }, at + 0.15)
        .to(q("[data-bar]"), { scaleX: (i + 1) / n, duration: 0.8 }, at)
        .to({}, { duration: 0.2 }, at + 0.8);
    }
  }, { scope: root });

  return (
    <section id="strategy" ref={root} aria-labelledby="strategy-title" className="relative">
      <div className="container-x flex flex-col gap-16 pt-36">
        <span className="eyebrow flex items-center gap-4 text-ice-deep"><span className="tnum">05</span><span className="block h-px w-10 iris-line" />Investment strategy
          {s.draft && <span className="rounded-full border border-ice-deep/40 px-2.5 py-1 text-[9px] tracking-[0.2em]">Draft</span>}
        </span>
        <h2 id="strategy-title" data-manifesto className="display vskew max-w-[1300px] text-[clamp(52px,8vw,148px)] leading-[0.92] tracking-[-0.03em]">
          {s.headline.map((w, i) => (
            <span key={i} data-word className={i >= s.italicFrom ? "serif text-ice-deep" : undefined}>{w} </span>
          ))}
        </h2>
        <p data-intro className="max-w-[640px] font-serif text-[clamp(24px,2.4vw,32px)] italic leading-[1.3] text-graphite-2">{s.intro}</p>
      </div>

      {/* the deck: held while each principle slides over the last */}
      <div data-deck className="strategy-deck relative" style={{ ["--cards" as string]: n }}>
        <div className="strategy-stage sticky top-0 flex h-[100svh] items-center overflow-hidden">
          <div className="container-x grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div aria-hidden className="flex items-end gap-4 lg:flex-col lg:items-start">
              <span className="tnum relative block h-[0.82em] overflow-hidden font-serif text-[clamp(96px,12vw,200px)] leading-[0.82] text-ice-deep">
                <span data-roll className="block">
                  {s.principles.map((_, i) => <span key={i} className="block h-[0.82em]">{pad2(i + 1)}</span>)}
                </span>
              </span>
              <span className="tnum pb-2 font-mono text-[12px] tracking-[0.2em] text-mute">/ {pad2(n)}</span>
              <span className="hidden h-px w-48 overflow-hidden bg-line lg:block"><span data-bar className="block h-px origin-left bg-ice-deep" style={{ transform: `scaleX(${1 / n})` }} /></span>
            </div>
            <ol className="strategy-cards relative">
              {s.principles.map((p, i) => (
                <li key={p.title} data-card className="strategy-card glass flex flex-col gap-5 rounded-[28px] p-8 md:p-12" style={{ zIndex: i + 1 }}>
                  <span className="tnum text-[11px] tracking-[0.2em] text-ice-deep">{pad2(i + 1)} · Principle</span>
                  <h3 className="font-serif text-[clamp(34px,3.6vw,58px)] leading-[1.02]">{p.title}</h3>
                  <p className="max-w-[560px] text-base leading-[1.75] text-graphite-2 md:text-lg">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {documents.length > 0 && (
        <div data-docs className="container-x flex flex-col gap-8 pb-32 lg:-mt-[12svh]">
          <span className="eyebrow flex items-center gap-4 text-ice-deep"><span className="block h-px w-10 iris-line" />Documents</span>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {documents.map((d) => {
              const inner = (
                <>
                  <span aria-hidden className="flex h-14 w-11 shrink-0 items-end justify-start rounded-[6px] border border-white/15 bg-white/[0.03] p-1.5 font-mono text-[8px] tracking-[0.12em] text-ice-deep [clip-path:polygon(0_0,72%_0,100%_22%,100%_100%,0_100%)]">
                    {d.format === "Excel" ? "XLSX" : d.format.toUpperCase()}
                  </span>
                  <span className="flex flex-col gap-3">
                    <span className="font-serif text-[clamp(28px,2.6vw,40px)] leading-[1.05]">{d.title}</span>
                    <span className="max-w-[460px] text-[15px] leading-[1.7] text-graphite-2">{d.body}</span>
                  </span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-4">
                    <span className="tnum font-mono text-[10px] uppercase tracking-[0.18em] text-mute">{d.format}{d.size ? ` · ${d.size}` : ""}</span>
                    {d.href
                      ? <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ice-deep">Download <span aria-hidden className="transition-transform duration-500 group-hover:translate-y-1">↓</span></span>
                      : <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-mute">In preparation</span>}
                  </span>
                </>
              );
              const cls = "glass flex h-full flex-col gap-8 rounded-[28px] p-8 md:p-10";
              return (
                <li key={d.title} data-doc>
                  {d.href
                    ? <a href={d.href} download data-cursor="Download" aria-label={`Download ${d.title} (${d.format}${d.size ? `, ${d.size}` : ""})`}
                        className={`${cls} group transition-colors duration-500 hover:border-ice-deep/40 hover:bg-white/[0.04]`}>{inner}</a>
                    : <div className={`${cls} opacity-70`} aria-label={`${d.title} (${d.format}): in preparation`}>{inner}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
