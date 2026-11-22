"use client";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { pad2 } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface StrategyContent {
  draft: boolean;
  headline: string[];
  italicFrom: number;
  intro: string;
  principles: { title: string; body: string }[];
}

/** 05 — personal philosophy. The headline lights up word by word as you scroll; the counter follows the principle in view. */
export default function Strategy({ s }: { s: StrategyContent }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo("[data-word]", { opacity: 0.12, filter: "blur(6px)" }, {
      opacity: 1, filter: "blur(0px)", stagger: 0.12, ease: "none",
      scrollTrigger: { trigger: "[data-manifesto]", start: "top 80%", end: "bottom 35%", scrub: 0.6 },
    });
    gsap.utils.toArray<HTMLElement>("[data-principle]").forEach((el, i) => {
      ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (st) => st.isActive && setActive(i) });
      gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
  }, { scope: root });

  return (
    <section id="strategy" ref={root} aria-labelledby="strategy-title" className="relative">
      <div className="container-x flex flex-col gap-[110px] py-36">
        <div className="flex flex-col gap-10">
          <span className="eyebrow flex items-center gap-4 text-champagne-deep"><span className="tnum">05</span><span className="block h-px w-10 bg-champagne" />Investment strategy
            {s.draft && <span className="rounded-full border border-champagne-deep/40 px-2.5 py-1 text-[9px] tracking-[0.2em]">Draft</span>}
          </span>
          <h2 id="strategy-title" data-manifesto className="display max-w-[1300px] text-[clamp(52px,8vw,148px)] leading-[0.92] tracking-[-0.03em]">
            {s.headline.map((w, i) => (
              <span key={i} data-word className={i >= s.italicFrom ? "bg-gradient-to-r from-lavender-deep to-ice-deep bg-clip-text italic text-transparent" : undefined}>{w} </span>
            ))}
          </h2>
        </div>
        <div className="flex flex-wrap items-start gap-16">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-7 lg:sticky lg:top-36">
            <p className="font-serif text-[32px] italic leading-[1.25] text-graphite-2">{s.intro}</p>
            <span className="tnum font-serif text-[120px] leading-[0.8] text-lavender-deep" aria-hidden>
              {pad2(active + 1)}<span className="text-[32px] text-mute"> / {pad2(s.principles.length)}</span>
            </span>
          </div>
          <ol className="flex min-w-0 flex-[1.6_1_520px] flex-col gap-4">
            {s.principles.map((p, i) => (
              <li key={p.title} data-principle className={`glass grid grid-cols-[56px_minmax(0,1fr)] gap-6 rounded-[24px] p-7 transition-[transform,box-shadow] duration-500 md:p-9 ${active === i ? "translate-x-0 shadow-[0_30px_70px_-35px_rgba(95,85,150,0.5)]" : ""}`}>
                <span className={`tnum pt-2 text-[11px] tracking-[0.2em] ${active === i ? "text-lavender-deep" : "text-mute"}`}>{pad2(i + 1)}</span>
                <div className="flex flex-col gap-3">
                  <h3 className="font-serif text-[clamp(30px,3vw,46px)] leading-none">{p.title}</h3>
                  <p className="max-w-[580px] text-base leading-[1.7] text-graphite-2">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
