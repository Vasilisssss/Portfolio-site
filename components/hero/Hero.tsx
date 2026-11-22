"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { site } from "@/content/site";
import { RevealText } from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";

gsap.registerPlugin(ScrollTrigger, useGSAP);
const Globe = dynamic(() => import("./Globe"), { ssr: false });

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to("[data-hero-copy]", { yPercent: -12, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    gsap.to("[data-hero-globe]", { yPercent: 18, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
    const ready = document.documentElement.dataset.ready === "1";
    const show = () => gsap.fromTo("[data-hero-fade]", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: "expo.out", stagger: 0.08, delay: 0.5 });
    if (ready) show(); else { gsap.set("[data-hero-fade]", { autoAlpha: 0 }); window.addEventListener("intro:done", show, { once: true }); }
  }, { scope: root });

  return (
    <section id="top" ref={root} className="relative flex min-h-[max(860px,100svh)] flex-col justify-end overflow-hidden" aria-label="Introduction">
      <div aria-hidden className="glow pointer-events-none absolute -right-[10%] -top-[20%] h-[1100px] w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgba(185,164,119,0.2),rgba(185,164,119,0.05)_55%,transparent)]" />
      <div data-hero-globe className="pointer-events-none relative mx-auto mt-20 h-[92vw] max-h-[520px] w-full md:absolute md:right-[-4%] md:top-[4%] md:mt-0 md:h-[min(900px,80vw)] md:max-h-none md:w-[min(1000px,90vw)]">
        <Globe className="h-full w-full" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[360px] bg-gradient-to-b from-transparent to-ink" />

      <div data-hero-copy className="container-x relative z-[2] w-full pb-16">
        <p data-hero-fade className="eyebrow mb-8 flex items-center gap-4 text-silver">
          <span className="block h-px w-12 bg-gold" />{site.hero.eyebrow} · Est. {site.founded}
        </p>
        <h1 className="display text-[clamp(56px,9.6vw,168px)] leading-[0.9] tracking-[-0.025em]">
          <RevealText as="span" onLoad className="block">{site.hero.lines[0]}</RevealText>
          <RevealText as="span" onLoad delay={0.15} className="block italic text-gold">{site.hero.lines[1]}</RevealText>
        </h1>
        <div className="mt-12 flex flex-wrap items-end justify-between gap-10">
          <p data-hero-fade className="max-w-[460px] text-[17px] leading-[1.7] text-ivory-dim">{site.hero.body}</p>
          <div data-hero-fade className="flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link href={site.hero.primary.href} data-cursor="Explore" className="group inline-flex h-[60px] items-center gap-3.5 rounded-full bg-ivory px-[30px] text-[11px] font-medium uppercase tracking-[0.24em] text-ink transition-colors hover:bg-gold">
                {site.hero.primary.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="transition-transform duration-500 group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </Link>
            </Magnetic>
            <Link href={site.hero.secondary.href} className="inline-flex h-[60px] items-center rounded-full border border-line-2 px-7 text-[11px] uppercase tracking-[0.24em] transition-colors hover:border-gold hover:text-gold">
              {site.hero.secondary.label}
            </Link>
          </div>
          <Link data-hero-fade href="/#portfolio" aria-label="Scroll to portfolio" className="flex flex-col items-center gap-3.5 text-[10px] tracking-[0.32em] text-silver">
            SCROLL
            <span className="block h-[72px] w-px overflow-hidden bg-[#26292d]"><span className="cue block h-6 w-px bg-gold" /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
