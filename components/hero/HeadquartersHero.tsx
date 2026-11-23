"use client";

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
 * Stage 2 headquarters landing-page prototype.
 * The architectural facade is an intentional media-independent placeholder.
 * Replace it with the owner-approved exterior MP4/poster once those files are
 * supplied in the repository; never point at an unverified shared-video URL.
 */
export default function HeadquartersHero({ name, eyebrow, lines, body, figure, showInvestments }: Props) {
  return (
    <section id="top" aria-label="Investment headquarters" className="headquarters-hero relative isolate flex min-h-[100svh] flex-col justify-between overflow-hidden">
      <div className="headquarters-atmosphere" aria-hidden="true">
        <div className="headquarters-sky" />
        <div className="headquarters-building">
          <div className="headquarters-crown" />
          <div className="headquarters-facade">
            {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
          </div>
          <div className="headquarters-podium">
            <div className="headquarters-entry"><i /><i /><i /></div>
          </div>
        </div>
        <div className="headquarters-reflection" />
        <div className="headquarters-ground" />
      </div>

      <div className="relative z-10 flex min-h-[100svh] w-full flex-col justify-between px-[clamp(24px,6vw,104px)] pb-10 pt-32 md:pb-14 md:pt-36">
        <div className="flex items-center justify-between gap-6">
          <p className="eyebrow flex items-center gap-4 text-white/75">
            <span className="h-px w-10 bg-[#c7a77a]" />
            <span className="text-[#d9c09b]">PRIVATE INVESTMENT OFFICE</span>
            <span className="hidden text-white/45 sm:inline">/ {eyebrow}</span>
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-white/55 sm:block">{name}</p>
        </div>

        <div className="max-w-[900px] pb-8 md:pb-12">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.34em] text-[#d9c09b] md:text-xs">
            An independent approach to capital
          </p>
          <h1 className="max-w-[12ch] text-[clamp(54px,8.8vw,142px)] font-normal leading-[0.88] tracking-[-0.065em] text-[#f4f1eb] [text-shadow:0_4px_45px_rgba(0,0,0,.5)]">
            {lines[0] || "Capital"}<br />
            <em className="font-serif font-normal text-[#d9c09b]">{lines[1] || "with conviction."}</em>
          </h1>
          <div className="mt-8 flex max-w-[690px] flex-col gap-7 md:mt-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[430px]">
              <p className="text-sm leading-[1.8] text-white/72 md:text-base">{body}</p>
              {figure && <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{figure.label}<span className="mt-2 block font-sans text-3xl tracking-tight text-white md:text-4xl">{figure.value}</span></p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {showInvestments && <Link href="/#investments" className="inline-flex h-12 items-center gap-5 bg-[#d9c09b] px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#11110f] transition-colors hover:bg-[#f0e4d0]">Explore the portfolio <span aria-hidden>↗</span></Link>}
              <Link href="/#strategy" className="inline-flex h-12 items-center border border-white/35 bg-black/15 px-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:border-[#d9c09b] hover:text-[#e5cba4]">Investment approach</Link>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-white/20 pt-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">Headquarters · Global markets</span>
          <a href="#capital-engine" className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-white/65 hover:text-white">
            Discover the institution <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-sm">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
