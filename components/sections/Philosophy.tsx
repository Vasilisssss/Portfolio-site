"use client";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { philosophy } from "@/content/site";
import { pad2 } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Philosophy() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // manifesto: words light up as you scroll
    gsap.fromTo("[data-word]", { opacity: 0.14 }, {
      opacity: 1, stagger: 0.12, ease: "none",
      scrollTrigger: { trigger: "[data-manifesto]", start: "top 80%", end: "bottom 35%", scrub: 0.6 },
    });
    // principle counter follows whichever principle is in the middle of the viewport
    gsap.utils.toArray<HTMLElement>("[data-principle]").forEach((el, i) => {
      ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (st) => st.isActive && setActive(i) });
      gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
  }, { scope: root });

  return (
    <section id="strategy" ref={root} aria-labelledby="strategy-title" className="relative z-[2] bg-ivory text-ink">
      <div className="container-x flex flex-col gap-[120px] py-40">
        <div className="flex flex-col gap-10">
          <span className="eyebrow text-gold-deep">III — Investment philosophy</span>
          <h2 id="strategy-title" data-manifesto className="display max-w-[1280px] text-[clamp(52px,8vw,148px)] leading-[0.92] tracking-[-0.025em]">
            {philosophy.headline.map((w, i) => (
              <span key={i} data-word className={i >= philosophy.italicFrom ? "italic" : undefined}>{w} </span>
            ))}
          </h2>
        </div>
        <div className="flex flex-wrap items-start gap-16">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-7 lg:sticky lg:top-36">
            <p className="font-serif text-[34px] italic leading-[1.25]">{philosophy.intro}</p>
            <span className="tnum font-serif text-[120px] leading-[0.8] text-gold-deep" aria-hidden>
              {pad2(active + 1)}<span className="text-[32px] text-[#8A8C8E]"> / {pad2(philosophy.principles.length)}</span>
            </span>
          </div>
          <ol className="flex min-w-0 flex-[1.6_1_520px] flex-col">
            {philosophy.principles.map((p, i) => (
              <li key={p.title} data-principle className="grid grid-cols-[64px_minmax(0,1fr)] gap-6 border-t border-[#CFCBC0] py-9">
                <span className={`tnum pt-3 text-[11px] tracking-[0.2em] transition-colors duration-500 ${active === i ? "text-ink" : "text-gold-deep"}`}>{pad2(i + 1)}</span>
                <div className="flex flex-col gap-3.5">
                  <h3 className="font-serif text-[clamp(32px,3.4vw,52px)] leading-none tracking-[-0.01em]">{p.title}</h3>
                  <p className="max-w-[560px] text-base leading-[1.7] text-[#45484C]">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
