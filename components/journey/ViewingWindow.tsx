"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion, finePointer, scrollToTarget } from "@/components/motion/gsap";
import Headline from "@/components/motion/Headline";
import { sceneSrc, CLOSING } from "./scenes";

export type WindowFrame = {
  roman: string; name: string; alt: string; focusX: number;
  figure?: { label: string; value: string };
} & ({ kind: "walk"; src: string; srcSm: string } | { kind: "room"; id: string });

/**
 * THE WINDOW — the whole journey, replayed through one frame.
 * A 400svh section (300svh on phones) with a sticky page-colour stage, driven by ONE scrubbed GSAP timeline
 * (scrub 1) that snaps between its labels (labelsDirectional, 0.25–0.7 s, power2.inOut):
 *   aperture  a small portrait window (≈22vw × 30vw, min 200 × 270, rounded, 1px hairline) shows the headquarters;
 *             the headline is split around it — "Look back" | "through the window." — and reveals line by line
 *   open      the window's clip-path opens to full bleed (never width/height); the image settles 1.2 → 1;
 *             the headline halves slide apart, blur and fade
 *   journey   headquarters → screens → gallery → chart → skyline: vertical curtain wipes (incoming 1.08 → 1,
 *             outgoing drifts up 6%); bottom-left caption (roman numeral, chapter, at most one real figure),
 *             bottom-right rolling counter 0N / 05, a 1px progress line along the bottom
 *   close     the brushed-metal closing shot wipes in, then the frame shuts to a thin horizontal slot with a
 *             champagne hairline at the seam, and the page continues onto Strategy
 * Fine pointers move the images ±10px (never the text). A skip link (visible on focus) jumps to #strategy.
 * Reduced motion: a static list of the five stops with their captions.
 */
export default function ViewingWindow({ frames, closing }: { frames: WindowFrame[]; closing: { id: string; alt: string; focusX: number } }) {
  const root = useRef<HTMLElement>(null);
  const n = frames.length;
  const pad = (i: number) => String(i).padStart(2, "0");

  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const ap = q("[data-ap]")[0] as HTMLElement;
    const layers = q("[data-frame]") as HTMLElement[];
    const imgs = q("[data-frame] [data-img]") as HTMLElement[];
    const caps = q("[data-cap]") as HTMLElement[];
    const digits = q("[data-digits]")[0] as HTMLElement;

    // the aperture rectangle as a clip-path inset, from the viewport (function-based, so it re-measures on refresh)
    const rect = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const w = Math.max(200, Math.min(vw * 0.22, 380)), h = Math.max(270, w * (30 / 22));
      const x = (vw - w) / 2, y = (vh - h) / 2;
      return `inset(${y}px ${x}px ${y}px ${x}px round 28px)`;
    };
    gsap.set(ap, { clipPath: rect });
    gsap.set(imgs[0], { scale: 1.2 });
    layers.forEach((l, i) => { if (i > 0) gsap.set(l, { clipPath: "inset(100% 0% 0% 0%)" }); });
    caps.forEach((c, i) => { if (i > 0) gsap.set(c, { yPercent: 100, autoAlpha: 0 }); });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: el, start: "top top", end: "bottom bottom", scrub: 1, invalidateOnRefresh: true,
        // snapping between stops (off for automated screenshots, which jump straight to a scroll position)
        snap: new URLSearchParams(location.search).has("qa") ? undefined : { snapTo: "labelsDirectional", duration: { min: 0.25, max: 0.7 }, ease: "power2.inOut", delay: 0.08 },
      },
    });
    tl.addLabel("aperture", 0)
      .to({}, { duration: 0.35 })
      // open: clip to full bleed, counter-scale, headline apart
      .to(ap, { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 1, ease: "power2.inOut" }, "open")
      .to(imgs[0], { scale: 1, duration: 1, ease: "power2.out" }, "open")
      .to(q("[data-half-l]"), { xPercent: -60, autoAlpha: 0, filter: "blur(8px)", duration: 0.7, ease: "power2.in" }, "open")
      .to(q("[data-half-r]"), { xPercent: 60, autoAlpha: 0, filter: "blur(8px)", duration: 0.7, ease: "power2.in" }, "open")
      .to(q("[data-hair]"), { autoAlpha: 0, duration: 0.3 }, "open")
      .to(q("[data-eyebrow]"), { autoAlpha: 0, y: -12, duration: 0.4 }, "open")
      .fromTo(q("[data-hud]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, "open+=0.6")
      .addLabel("stop0")
      .to({}, { duration: 0.5 });
    // the journey: one curtain wipe per stop
    for (let i = 1; i < n; i++) {
      const at = `wipe${i}`;
      tl.addLabel(at)
        .to(layers[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power3.inOut" }, at)
        .fromTo(imgs[i], { scale: 1.08 }, { scale: 1, duration: 1.2, ease: "power2.out" }, at)
        .to(imgs[i - 1], { yPercent: -6, duration: 1, ease: "power2.in" }, at)
        .to(caps[i - 1], { yPercent: -100, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, `${at}+=0.2`)
        .to(caps[i], { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: "power3.out" }, `${at}+=0.5`)
        .to(digits, { yPercent: -(100 / n) * i, duration: 0.6, ease: "power3.inOut" }, `${at}+=0.3`)
        .addLabel(`stop${i}`)
        .to({}, { duration: 0.5 });
    }
    // close: the metal shot, then the slot
    const last = layers.length - 1;
    tl.addLabel("metal")
      .to(layers[last], { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power3.inOut" }, "metal")
      .fromTo(imgs[last], { scale: 1.08 }, { scale: 1, duration: 1.2, ease: "power2.out" }, "metal")
      .to(imgs[last - 1], { yPercent: -6, duration: 1, ease: "power2.in" }, "metal")
      .to(q("[data-hud]"), { autoAlpha: 0, duration: 0.4 }, "metal+=0.3")
      .addLabel("closing")
      .to({}, { duration: 0.35 })
      .to(ap, { clipPath: () => `inset(${window.innerHeight / 2 - 1}px 0px ${window.innerHeight / 2 - 1}px 0px round 0px)`, duration: 1, ease: "power3.inOut" }, "shut")
      .fromTo(q("[data-seam]"), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power3.out" }, "shut+=0.4")
      .addLabel("shut")
      .to(q("[data-seam]"), { autoAlpha: 0.35, duration: 0.3 });
    // progress line, across the whole timeline
    tl.fromTo(q("[data-line]"), { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: "none" }, 0);

    // pointer parallax on the images only
    if (finePointer()) {
      const wrap = q("[data-par]")[0] as HTMLElement;
      const x = gsap.quickTo(wrap, "x", { duration: 1, ease: "power3" }), y = gsap.quickTo(wrap, "y", { duration: 1, ease: "power3" });
      const move = (e: PointerEvent) => { x((e.clientX / window.innerWidth - 0.5) * -20); y((e.clientY / window.innerHeight - 0.5) * -20); };
      el.addEventListener("pointermove", move);
      return () => el.removeEventListener("pointermove", move);
    }
  }, { scope: root });

  const picture = (f: WindowFrame | { kind: "closing"; id: string; alt: string; focusX: number }, i: number) => (
    <picture>
      {f.kind === "room" || f.kind === "closing" ? (
        <>
          <source media="(max-aspect-ratio: 4/5) and (max-width: 820px)" srcSet={sceneSrc(f.id, "tall-sm")} />
          <source media="(max-aspect-ratio: 4/5)" srcSet={sceneSrc(f.id, "tall")} />
          <source media="(max-width: 820px)" srcSet={sceneSrc(f.id, "wide-sm")} />
          <img data-img src={sceneSrc(f.id, "wide")} alt={f.alt} loading="lazy" decoding="async" className="h-full w-full object-cover will-change-transform" style={{ objectPosition: `${f.focusX * 100}% 50%` }} />
        </>
      ) : (
        <>
          <source media="(max-width: 820px)" srcSet={f.srcSm} />
          <img data-img src={f.src} alt={f.alt} loading="lazy" decoding="async" className="h-full w-full object-cover will-change-transform" style={{ objectPosition: "50% 50%" }} data-i={i} />
        </>
      )}
    </picture>
  );

  return (
    <section ref={root} id="window" aria-label="The Window: the journey seen through one frame" className="viewing-window relative z-[3]">
      <a href="#strategy" onClick={(e) => { e.preventDefault(); const t = document.getElementById("strategy"); if (t) { scrollToTarget(t, false); t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); } }}
        className="sr-only z-[30] focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-full focus:bg-ice-deep focus:px-4 focus:py-3 focus:font-mono focus:text-[11px] focus:uppercase focus:tracking-[0.2em] focus:text-snow">
        Skip the window
      </a>

      {/* animated stage */}
      <div className="rm-hide window-stage sticky top-0 h-[100svh] overflow-hidden">
        <p data-eyebrow className="eyebrow absolute left-[clamp(20px,3.2vw,48px)] top-[clamp(96px,14svh,140px)] z-[4] flex items-center gap-4 text-ice-deep"><span className="block h-px w-10 bg-ice-deep/70" />The Window</p>

        <div data-ap className="absolute inset-0 z-[2] overflow-hidden bg-pearl-2">
          <div data-par className="absolute -inset-[14px]">
            {frames.map((f, i) => (
              <div key={f.roman} data-frame className="absolute inset-0 overflow-hidden">{picture(f, i)}</div>
            ))}
            <div data-frame className="absolute inset-0 overflow-hidden">{picture({ kind: "closing", ...closing }, n)}</div>
          </div>
          <div aria-hidden className="window-grade pointer-events-none absolute inset-0" />
        </div>
        {/* hairline around the small window (fades as it opens) */}
        <div data-hair aria-hidden className="window-hair pointer-events-none absolute left-1/2 top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-ice-deep/45" />

        {/* the headline, split around the window: each half sits against the window's edge */}
        <h2 className="window-h display pointer-events-none absolute inset-0 z-[4] text-graphite">
          <span data-half-l className="window-half-l"><Headline as="span" drift={false} className="block">Look back</Headline></span>
          <span data-half-r className="window-half-r"><Headline as="span" drift={false} className="block"><em className="text-ice-deep">through the window.</em></Headline></span>
        </h2>

        {/* HUD: caption, counter, progress */}
        <div data-hud className="absolute inset-x-0 bottom-0 z-[5] opacity-0">
          <div className="container-x flex items-end justify-between gap-6 pb-20 lg:pb-8">
            <div className="relative h-[3.4em] min-w-0 flex-1 overflow-hidden text-[clamp(14px,1.3vw,17px)]">
              {frames.map((f) => (
                <p key={f.roman} data-cap className="absolute inset-x-0 bottom-0 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-serif text-[1.9em] italic leading-none text-ice-deep">{f.roman}</span>
                  <span className="font-mono text-[0.7em] uppercase tracking-[0.22em] text-graphite">{f.name}</span>
                  {f.figure && <span className="font-mono text-[0.7em] uppercase tracking-[0.18em] text-graphite-2">{f.figure.label} <span className="tnum text-graphite">{f.figure.value}</span></span>}
                </p>
              ))}
            </div>
            <div aria-hidden className="flex shrink-0 items-baseline gap-2 font-sans">
              <span className="relative block h-[1em] overflow-hidden text-[clamp(40px,5vw,72px)] leading-none tracking-[-0.04em] text-graphite">
                <span data-digits className="tnum block">
                  {frames.map((_, i) => <span key={i} className="block h-[1em]">{pad(i + 1)}</span>)}
                </span>
              </span>
              <span className="tnum text-[clamp(20px,2.4vw,34px)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(243,242,237,0.55)]">/ {pad(n)}</span>
            </div>
          </div>
          <span aria-hidden className="block h-px w-full bg-white/10"><span data-line className="block h-px w-full origin-left scale-x-0 bg-ice-deep" /></span>
        </div>
        <span data-seam aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 z-[6] block h-px origin-center scale-x-0 bg-ice-deep" />
      </div>

      {/* reduced motion: the stops as a list */}
      <div className="rm-only container-x py-24">
        <h2 className="display mb-12 text-[clamp(44px,6vw,96px)] leading-[0.95]">Look back <em>through the window.</em></h2>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {frames.map((f, i) => (
            <li key={f.roman} className="flex flex-col gap-3">
              <div className="aspect-[16/10] overflow-hidden rounded-[22px]">{picture(f, i)}</div>
              <p className="flex flex-wrap items-baseline gap-x-4">
                <span className="font-serif text-2xl italic text-ice-deep">{f.roman}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]">{f.name}</span>
                {f.figure && <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-graphite-2">{f.figure.label} <span className="tnum text-graphite">{f.figure.value}</span></span>}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <span className="sr-only">{CLOSING.alt}</span>
    </section>
  );
}
