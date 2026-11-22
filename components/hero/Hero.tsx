"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { RevealText } from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";
import type { Orb } from "./Sculpture";

gsap.registerPlugin(ScrollTrigger, useGSAP);
const Sculpture = dynamic(() => import("./Sculpture"), { ssr: false });

export default function Hero({ eyebrow, lines, body, orbs, showInvestments }: {
  eyebrow: string; lines: string[]; body: string; orbs: Orb[]; showInvestments: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to("[data-hero-copy]", { yPercent: -14, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    const show = () => gsap.fromTo("[data-hero-fade]", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out", stagger: 0.08, delay: 0.45 });
    if (document.documentElement.dataset.ready === "1") show();
    else { gsap.set("[data-hero-fade]", { autoAlpha: 0 }); window.addEventListener("intro:done", show, { once: true }); }
  }, { scope: root });

  return (
    <section id="top" ref={root} aria-label="Introduction" className="relative flex min-h-[max(860px,100svh)] flex-col justify-end overflow-hidden">
      <div className="relative mx-auto mt-24 h-[92vw] max-h-[560px] w-full md:absolute md:right-[-6%] md:top-[2%] md:mt-0 md:h-[min(920px,82vw)] md:max-h-none md:w-[min(1080px,66vw)]">
        <div aria-hidden className="absolute inset-[22%] rounded-full bg-[conic-gradient(from_200deg,#cde6fb,#e3dcfb,#f6e0ef,#d9f3ec,#cde6fb)] opacity-60 blur-3xl" />
        <Sculpture orbs={orbs} className="h-full w-full" />
      </div>

      <div data-hero-copy className="container-x pointer-events-none relative z-[2] w-full pb-16">
        <p data-hero-fade className="eyebrow mb-8 flex items-center gap-4 text-mute">
          <span className="block h-px w-12 bg-gradient-to-r from-ice-deep to-lavender-deep" />{eyebrow}
        </p>
        <h1 className="display text-[clamp(56px,9.4vw,164px)] leading-[0.9] tracking-[-0.03em]">
          <RevealText as="span" onLoad className="block">{lines[0]}</RevealText>
          <RevealText as="span" onLoad delay={0.15} className="block iris-text pb-[0.08em] italic text-transparent">{lines[1]}</RevealText>
        </h1>
        <div className="pointer-events-auto mt-12 flex flex-wrap items-end justify-between gap-10">
          <p data-hero-fade className="max-w-[440px] text-[17px] leading-[1.7] text-graphite-2">{body}</p>
          <div data-hero-fade className="flex flex-wrap items-center gap-4">
            {showInvestments && (
              <Magnetic>
                <Link href="/#investments" data-cursor="Explore" className="group inline-flex h-[60px] items-center gap-3.5 rounded-full bg-graphite px-[30px] text-[11px] font-medium uppercase tracking-[0.24em] text-snow transition-colors hover:bg-lavender-deep">
                  Explore my investments
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="transition-transform duration-500 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              </Magnetic>
            )}
            <Link href="/#strategy" className="glass inline-flex h-[60px] items-center rounded-full px-7 text-[11px] uppercase tracking-[0.24em] transition-colors hover:text-lavender-deep">How I invest</Link>
          </div>
          <Link data-hero-fade href="/#overview" aria-label="Scroll to overview" className="flex flex-col items-center gap-3.5 text-[10px] tracking-[0.32em] text-mute">
            SCROLL
            <span className="block h-[72px] w-px overflow-hidden bg-line-2"><span className="cue block h-6 w-px bg-lavender-deep" /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
