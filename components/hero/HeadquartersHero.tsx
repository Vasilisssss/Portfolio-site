"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import Headline from "@/components/motion/Headline";
import Magnetic from "@/components/ui/Magnetic";
import RollText from "@/components/motion/RollText";
import { WALK, walkSrc } from "@/components/journey/scenes";

type Props = {
  name: string;
  eyebrow: string;
  lines: string[];
  body: string;
  figure?: { value: string; label: string };
  /** when the IBKR data last changed (ISO, UTC): shown under the figure as "Updated …" */
  updatedAt?: string;
  showInvestments: boolean;
};

/**
 * "Updated 25 Nov 2026, 22:17": the time of the last data change. The static page carries it in UTC; once loaded it is
 * shown in the visitor's own time zone (with the zone's short name).
 */
function Updated({ iso }: { iso: string }) {
  const d = new Date(iso);
  const fmt = (tz?: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz, timeZoneName: "short" }).format(d);
  const [text, setText] = useState(() => fmt("UTC"));
  useEffect(() => { setText(fmt()); }, [iso]); // eslint-disable-line react-hooks/exhaustive-deps
  if (Number.isNaN(d.getTime())) return null;
  return <span className="mt-3 block normal-case tracking-[0.08em] text-white/50"><time dateTime={iso} suppressHydrationWarning>Updated {text}</time></span>;
}

/**
 * THE HEADQUARTERS WALK — the hero.
 * A tall section (300vh desktop, 220vh phones) with a sticky 100svh stage: scrolling is walking. The camera itself
 * is drawn by the journey stage behind the page (components/journey), which reads this section's progress as the
 * walk's playhead — scroll down to walk forward, up to walk back.
 * Choreography on top of the footage:
 *   0–2 %    the copy is fully on screen (headline, body, portfolio value, both calls to action)
 *   2–26 %   the copy rises, blurs and fades away as the walk begins
 *   doors    the "Headquarters · Global markets" caption rolls to "Entering"; a brief warm bloom (opacity only)
 *            as the camera passes the portal, and the trading floor resolves
 *   a champagne line along the bottom traces the walk
 * The first frame is a server-rendered poster (the LCP image); the canvas takes over once frames are ready.
 * Reduced motion: one viewport, the still poster, no scrubbing.
 */
export default function HeadquartersHero({ lines, body, figure, updatedAt, showInvestments }: Props) {
  const root = useRef<HTMLElement>(null);
  const doorsAt = WALK.doors / Math.max(1, WALK.frames - 1);

  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    // the poster steps back once the live stage is drawing
    const onReady = () => gsap.to(q("[data-poster]"), { autoAlpha: 0, duration: 0.8, ease: "power2.out" });
    window.addEventListener("journey:ready", onReady, { once: true });

    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true } });
    tl.to(q("[data-copy]"), { yPercent: -18, autoAlpha: 0, filter: "blur(10px)", ease: "power2.in", duration: 0.24 }, 0.02)
      .to(q("[data-progress]"), { scaleX: 1, duration: 1 }, 0)
      // caption roll at the doors
      .to(q("[data-cap-a]"), { yPercent: -100, duration: 0.03, ease: "power2.inOut" }, doorsAt - 0.06)
      .to(q("[data-cap-b]"), { yPercent: -100, duration: 0.03, ease: "power2.inOut" }, doorsAt - 0.06)
      // warm bloom as the portal passes the camera
      .fromTo(q("[data-bloom]"), { opacity: 0 }, { opacity: 0.7, duration: 0.05, ease: "power2.out" }, doorsAt - 0.05)
      .to(q("[data-bloom]"), { opacity: 0, duration: 0.09, ease: "power2.inOut" }, doorsAt)
      // the scroll cue leaves with the copy, the closing hairline arrives on the trading floor
      .to(q("[data-cue]"), { autoAlpha: 0, duration: 0.08 }, 0.04)
      .fromTo(q("[data-arrive]"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.08, ease: "power2.out" }, Math.min(0.9, doorsAt + 0.08));
    // entrance of the copy after the intro curtain
    const enter = () => gsap.from(q("[data-enter]"), { y: 24, autoAlpha: 0, duration: 1.2, stagger: 0.08, ease: "expo.out", delay: 0.35 });
    if (document.documentElement.dataset.ready === "1") enter(); else window.addEventListener("intro:done", enter, { once: true });
    return () => { window.removeEventListener("journey:ready", onReady); window.removeEventListener("intro:done", enter); };
  }, { scope: root });

  return (
    <section ref={root} id="top" data-walk aria-label="Investment headquarters" className="walk relative">
      <div className="walk-stage sticky top-0 h-[100svh] overflow-hidden">
        {/* LCP: the walk's first frame, server-rendered; the journey canvas behind takes over once frames are decoded */}
        <picture data-poster className="absolute inset-0 block">
          <source media="(max-width: 820px)" srcSet={walkSrc(WALK.posterSm)} />
          <img src={walkSrc(WALK.poster)} alt="" width={WALK.w} height={WALK.h} fetchPriority="high" decoding="async" className="h-full w-full object-cover object-[50%_48%]" />
        </picture>
        <div aria-hidden className="walk-shade absolute inset-0" />
        <div aria-hidden data-bloom className="walk-bloom absolute inset-0 opacity-0" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between px-[clamp(24px,6vw,104px)] pb-20 pt-32 md:pb-14 md:pt-36 lg:pb-14">
          {/* top of the stage left clear: the name is already in the navigation bar */}
          <div aria-hidden />

          <div data-copy className="max-w-[900px] pb-8 will-change-transform md:pb-12">
            <Headline as="h1" onLoad drift={false} skew={false} className="display max-w-[12ch] text-[clamp(54px,8.8vw,142px)] leading-[0.88] tracking-[-0.065em] text-graphite [text-shadow:0_4px_45px_rgba(0,0,0,.5)]">
              {lines[0]}<br />
              <em className="text-ice-deep">{lines[1]}</em>
            </Headline>
            <div className="mt-8 flex max-w-[690px] flex-col gap-7 md:mt-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-[430px]">
                <p data-enter className="text-sm leading-[1.8] text-white/80 md:text-base">{body}</p>
                {figure && (
                  <p data-enter className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                    {figure.label}<span className="tnum mt-2 block font-sans text-3xl tracking-tight text-graphite md:text-4xl">{figure.value}</span>
                    {updatedAt && <Updated iso={updatedAt} />}
                  </p>
                )}
              </div>
              <div data-enter className="flex shrink-0 flex-wrap items-center gap-3">
                {showInvestments && (
                  <Magnetic strength={0.25}>
                    <Link href="/#investments" data-cursor="Explore" className="roll-host inline-flex h-12 items-center gap-5 bg-ice-deep px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-snow transition-colors hover:bg-[#f0e4d0]">
                      <RollText>Explore the portfolio</RollText><span aria-hidden>↗</span>
                    </Link>
                  </Magnetic>
                )}
                <Magnetic strength={0.25}>
                  <Link href="/#strategy" className="roll-host inline-flex h-12 items-center border border-white/45 bg-black/25 px-5 font-mono text-[10px] uppercase tracking-[0.2em] text-graphite backdrop-blur-sm transition-colors hover:border-ice-deep hover:text-ice-deep">
                    <RollText>Investment approach</RollText>
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>

          <div className="relative flex items-end justify-between border-t border-white/20 pt-4">
            <span aria-hidden data-progress className="absolute -top-px left-0 block h-px w-full origin-left scale-x-0 bg-ice-deep" />
            <span className="relative block h-[1.6em] overflow-hidden font-mono text-[9px] uppercase leading-[1.6em] tracking-[0.24em] text-white/60">
              <span data-cap-a className="block">Headquarters · Global markets</span>
              <span data-cap-b aria-hidden className="block text-ice-deep">Entering · The trading floor</span>
            </span>
            <span data-cue className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.24em] text-white/70">
              <span className="hidden sm:inline">Scroll to walk in</span> <span aria-hidden className="walk-cue relative block h-8 w-px overflow-hidden bg-white/20"><span className="absolute inset-x-0 top-0 block h-1/3 bg-ice-deep" /></span>
            </span>
            <span data-arrive aria-hidden className="absolute bottom-0 right-0 hidden font-mono sm:inline text-[9px] uppercase tracking-[0.24em] text-ice-deep opacity-0">II · The Capital Engine ↓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
