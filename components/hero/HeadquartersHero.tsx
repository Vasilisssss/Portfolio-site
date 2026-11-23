"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  name: string;
  eyebrow: string;
  lines: string[];
  body: string;
  figure?: { value: string; label: string };
  showInvestments: boolean;
};

/**
 * Headquarters hero: establishing clip followed by the entrance/arrival clip.
 * Media paths are intentionally local and same-origin for GitHub Pages export.
 * Optimized owner-approved MP4 files and poster frames are committed in public/media.
 * Keep the base-path prefix so the same component works on GitHub Pages exports.
 */
export default function HeadquartersHero({ name, eyebrow, lines, body, figure, showInvestments }: Props) {
  const [shot, setShot] = useState<0 | 1>(0);
  const [mediaReady, setMediaReady] = useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const mediaLayer = useRef<HTMLDivElement>(null);
  const firstVideo = useRef<HTMLVideoElement>(null);
  const secondVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = document.getElementById("top");
    const first = firstVideo.current;
    const second = secondVideo.current;
    if (!section || !first || !second) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      first.pause();
      second.pause();
      setMediaReady(false);
      return;
    }

    let raf = 0;
    let activeVideo: HTMLVideoElement | null = null;
    let inView = false;
    const sync = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (mediaLayer.current) {
        mediaLayer.current.style.opacity = String(1 - Math.min(1, Math.max(0, (progress - 0.9) / 0.1)));
      }
      const nextShot: 0 | 1 = progress < 0.5 ? 0 : 1;
      setShot(nextShot);
      const video = nextShot === 0 ? first : second;
      const other = nextShot === 0 ? second : first;

      if (video !== activeVideo) {
        other.pause();
        if (activeVideo) activeVideo.pause();
        video.currentTime = 0;
        activeVideo = video;
      }
      if (visible && inView) {
        if (video.paused) void video.play().catch(() => setMediaReady(false));
      } else {
        video.pause();
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(sync); };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    }, { threshold: 0.01 });
    observer.observe(section);
    first.addEventListener("loadeddata", schedule);
    second.addEventListener("loadeddata", schedule);
    first.addEventListener("canplay", schedule);
    second.addEventListener("canplay", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      first.removeEventListener("loadeddata", schedule);
      second.removeEventListener("loadeddata", schedule);
      first.removeEventListener("canplay", schedule);
      second.removeEventListener("canplay", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      first.pause();
      second.pause();
    };
  }, []);

  return (
    <section id="top" aria-label="Investment headquarters" className="headquarters-hero relative isolate min-h-[200svh]">
      <div ref={mediaLayer} className="headquarters-media" aria-hidden="true">
        <div className="headquarters-fallback"><img src={`${basePath}/media/headquarters-establishing.jpg`} alt="" fetchPriority="high" decoding="async" /></div>
        <video ref={firstVideo} className={`headquarters-video ${shot === 0 ? "is-active" : ""}`} src={`${basePath}/media/headquarters-establishing.mp4`} poster={`${basePath}/media/headquarters-establishing.jpg`} muted playsInline loop preload="auto" onLoadedData={() => setMediaReady(true)} onError={() => setMediaReady(false)} />
        <video ref={secondVideo} className={`headquarters-video ${shot === 1 ? "is-active" : ""}`} src={`${basePath}/media/headquarters-arrival.mp4`} poster={`${basePath}/media/headquarters-arrival.jpg`} muted playsInline preload="auto" onLoadedData={() => setMediaReady(true)} onError={() => setMediaReady(false)} />
        <div className="headquarters-vignette" />
        <div className="headquarters-film-grain" />
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex min-h-[100svh] w-full flex-col justify-between px-[clamp(24px,6vw,104px)] pb-10 pt-32 md:pb-14 md:pt-36">
        <div className="flex items-center justify-between gap-6">
          <p className="eyebrow flex items-center gap-4 text-white/75">
            <span className="h-px w-10 bg-[#c7a77a]" />
            <span className="text-[#d9c09b]">VASILIS MAVROUDES</span>
            <span className="hidden text-white/45 sm:inline">/ {eyebrow}</span>
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-white/55 sm:block">{name}</p>
        </div>

        <div className="max-w-[900px] pb-8 md:pb-12">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.34em] text-[#d9c09b] md:text-xs">
            INVESTOR  ·  CFA LEVEL III CANDIDATE
          </p>
          <h1 className="max-w-[12ch] text-[clamp(54px,8.8vw,142px)] font-normal leading-[0.88] tracking-[-0.065em] text-[#f4f1eb] [text-shadow:0_4px_45px_rgba(0,0,0,.5)]">
            {lines[0] || "Capital"}<br />
            <em className="font-serif font-normal text-[#d9c09b]">{lines[1] || "with conviction."}</em>
          </h1>
          <div className="mt-8 flex max-w-[690px] flex-col gap-7 md:mt-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[430px]">
              <p className="text-sm leading-[1.8] text-white/80 md:text-base">{body}</p>
              {figure && <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">{figure.label}<span className="mt-2 block font-sans text-3xl tracking-tight text-white md:text-4xl">{figure.value}</span></p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {showInvestments && <Link href="/#investments" className="inline-flex h-12 items-center gap-5 bg-[#d9c09b] px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#11110f] transition-colors hover:bg-[#f0e4d0]">Explore the portfolio <span aria-hidden>↗</span></Link>}
              <Link href="/#strategy" className="inline-flex h-12 items-center border border-white/45 bg-black/25 px-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:border-[#d9c09b] hover:text-[#e5cba4]">Investment approach</Link>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-white/25 pt-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/55">Headquarters · Global markets</span>
          <a href="#capital-engine" className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-white/75 hover:text-white">
            Discover the institution <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-sm">↓</span>
          </a>
        </div>
      </div>
      {!mediaReady && <span className="sr-only">Headquarters film poster fallback is displayed while the video loads.</span>}
    </section>
  );
}
