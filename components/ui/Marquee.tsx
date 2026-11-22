"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface MarqueeItem { label: string; value?: string; tone?: "gain" | "loss" | "flat" }

/**
 * Kinetic ticker band: two rows drifting in opposite directions. Scrolling speeds it up and skews it slightly
 * (scroll velocity), then it eases back. Static under reduced motion. Content is real portfolio data.
 */
export default function Marquee({ rows }: { rows: MarqueeItem[][] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tracks = gsap.utils.toArray<HTMLElement>("[data-track]", root.current);
    const state = tracks.map((el, i) => ({ el, x: 0, dir: i % 2 ? 1 : -1, w: el.scrollWidth / 2 }));
    let boost = 0, skew = 0;
    const st = ScrollTrigger.create({
      trigger: root.current, start: "top bottom", end: "bottom top",
      onUpdate: (self) => { const v = self.getVelocity(); boost = Math.min(Math.abs(v) / 120, 14); skew = gsap.utils.clamp(-6, 6, v / 250); },
    });
    const tick = (_t: number, dt: number) => {
      boost *= 0.94; skew *= 0.9;
      state.forEach((s) => {
        s.x += s.dir * (0.045 + boost * 0.04) * dt;
        if (s.x <= -s.w) s.x += s.w;
        if (s.x >= 0) s.x -= s.w;
        gsap.set(s.el, { x: s.x, skewX: s.dir * skew });
      });
    };
    state.forEach((s) => { if (s.dir > 0) s.x = -s.w; });
    gsap.ticker.add(tick);
    const onResize = () => state.forEach((s) => (s.w = s.el.scrollWidth / 2));
    window.addEventListener("resize", onResize);
    return () => { gsap.ticker.remove(tick); st.kill(); window.removeEventListener("resize", onResize); };
  }, { scope: root });

  return (
    <div ref={root} aria-label="Portfolio ticker" role="region" className="relative overflow-hidden border-y border-white/80 py-6 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {rows.map((row, r) => (
        <div key={r} data-track className="flex w-max whitespace-nowrap will-change-transform" aria-hidden={r > 0}>
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy > 0}>
              {row.map((it, i) => (
                <span key={i} className={`flex items-baseline gap-4 px-8 ${r % 2 ? "py-1" : "py-2"}`}>
                  <span className={r % 2 ? "text-[clamp(20px,2.4vw,34px)] uppercase tracking-[0.2em] text-graphite-2" : "display text-[clamp(44px,6vw,96px)] leading-none"}>{it.label}</span>
                  {it.value && (
                    <span className={`tnum ${r % 2 ? "text-[clamp(16px,1.6vw,22px)]" : "text-[clamp(18px,2vw,28px)]"} ${it.tone === "gain" ? "text-gain" : it.tone === "loss" ? "text-loss" : "text-mute"}`}>{it.value}</span>
                  )}
                  <span aria-hidden className="mx-4 inline-block h-2.5 w-2.5 rounded-full bg-[conic-gradient(#8ec5f0,#b9aef0,#f1b9d8,#9fdcc9,#8ec5f0)] self-center" />
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
