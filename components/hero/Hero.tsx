"use client";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Magnetic from "@/components/ui/Magnetic";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Chapter I — The Portal. The 3D iris sits behind; the copy is the threshold. */
export default function Hero({ name, eyebrow, lines, body, figure, showInvestments }: {
  name: string; eyebrow: string; lines: string[]; body: string; figure?: { value: string; label: string }; showInvestments: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // as you scroll into the portal the copy recedes and blurs away
    gsap.to("[data-hero-copy]", { yPercent: -18, autoAlpha: 0, filter: "blur(8px)", ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    const show = () => gsap.fromTo("[data-hero-fade]", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out", stagger: 0.08, delay: 0.5 });
    if (document.documentElement.dataset.ready === "1") show();
    else { gsap.set("[data-hero-fade]", { autoAlpha: 0 }); window.addEventListener("intro:done", show, { once: true }); }
  }, { scope: root });

  return (
    <section id="top" ref={root} aria-label="Introduction" className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden">
      <div data-hero-copy className="container-x relative z-[2] flex w-full flex-1 flex-col justify-between pb-14 pt-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-[-50vw] bottom-0 -z-10 h-[60%] bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div data-hero-fade className="flex flex-wrap items-start justify-between gap-6">
          <p className="eyebrow flex items-center gap-4 text-graphite-2"><span className="whitespace-nowrap text-lime">Chapter I</span><span className="block h-px w-10 shrink-0 bg-lime/60 md:w-12" />{eyebrow}</p>
          <p className="eyebrow hidden text-mute sm:block">{name}</p>
        </div>

        <div className="flex flex-col gap-10">
          <h1 className="display text-[clamp(64px,12.5vw,228px)] leading-[0.82] [text-shadow:0_6px_80px_rgba(0,0,0,0.7)]">
            {/* CSS-only reveal: starts at first paint, independent of JavaScript (fast LCP) */}
            <span className="block overflow-hidden pb-[0.06em]"><span className="hero-line block" style={{ ["--d" as string]: "0.35s" }}>{lines[0]}</span></span>
            <span className="block overflow-hidden pb-[0.1em]"><span className="hero-line block" style={{ ["--d" as string]: "0.5s" }}><em className="text-lime">{lines[1]}</em></span></span>
          </h1>
          <div className="flex flex-wrap items-end justify-between gap-10">
            <p className="max-w-[420px] text-[16px] leading-[1.7] text-graphite-2">{body}</p>
            {figure && (
              <div data-hero-fade className="flex flex-col gap-2">
                <span className="label">{figure.label}</span>
                <span className="tnum display text-[clamp(40px,4.6vw,76px)] leading-none">{figure.value}</span>
              </div>
            )}
            <div data-hero-fade className="flex flex-wrap items-center gap-4">
              {showInvestments && (
                <Magnetic>
                  <Link href="/#investments" data-cursor="Enter" className="group inline-flex h-[58px] items-center gap-3.5 rounded-full bg-lime px-7 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:bg-graphite">
                    Enter the portfolio
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="transition-transform duration-500 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                </Magnetic>
              )}
              <Link href="/#strategy" className="inline-flex h-[58px] items-center rounded-full border border-white/20 px-7 font-mono text-[11px] uppercase tracking-[0.2em] backdrop-blur transition-colors hover:border-lime hover:text-lime">How I invest</Link>
            </div>
          </div>
          <span data-hero-fade className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.3em] text-mute">
            <span className="block h-10 w-px overflow-hidden bg-white/15"><span className="cue block h-4 w-px bg-lime" /></span>
            Scroll to enter
          </span>
        </div>
      </div>
    </section>
  );
}
