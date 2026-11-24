"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import Headline from "@/components/motion/Headline";
import Ticker, { type TickKind } from "@/components/ui/Ticker";
import { sceneSrc } from "./scenes";

export interface ChapterStat { value: string; label: string; tone?: "gain" | "loss" | "flat"; count?: { value: number; kind: TickKind; currency?: string } }

/**
 * CHAPTER CARD (II–V) — the doorway into each room.
 * The card is transparent and taller than the viewport (a sticky stage held for ~60vh): the journey stage behind
 * it flies forward into this chapter's room while the card's top travels up the screen, then keeps pushing in
 * slowly while the card is held.
 * Choreography: the outlined roman numeral scales 0.6 → 1 and lifts as the card arrives (scrubbed), the kicker and
 * rule slide in, the title reveals line by line, the figures count up from 0, the note fades up. While the card is
 * held, the copy drifts up a few percent so nothing is ever perfectly still; as the card leaves, the copy lifts and
 * fades before the content slides over it.
 * Reduced motion: no hold; the room is shown as a still image behind the card.
 */
export default function Chapter({ index, roman, title, kicker, stats, note, still }: {
  index: number; roman: string; title: React.ReactNode; kicker: string;
  stats?: ChapterStat[]; note?: string;
  still: { id: string; alt: string; focusX: number } | { src: string; alt: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    // arrival: from the card's top entering the viewport to it reaching the top
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.5 } })
      .fromTo(q("[data-numeral]"), { scale: 0.6, yPercent: 30, autoAlpha: 0 }, { scale: 1, yPercent: 0, autoAlpha: 1, ease: "power2.out" }, 0);
    gsap.from(q("[data-kicker]"), { x: -40, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 55%", once: true } });
    gsap.from(q("[data-rule]"), { scaleX: 0, transformOrigin: "0 50%", duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 55%", once: true } });
    gsap.from(q("[data-stat]"), { y: 28, autoAlpha: 0, duration: 1.2, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 35%", once: true } });
    gsap.from(q("[data-note]"), { y: 20, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 30%", once: true } });
    // the hold: a slow upward drift, then the copy lifts away as the card leaves
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 } })
      .to(q("[data-copy]"), { yPercent: -4 }, 0)
      .to(q("[data-numeral]"), { yPercent: -14 }, 0);
    gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el, start: "bottom bottom", end: "bottom 45%", scrub: 0.5 } })
      .to(q("[data-copy]"), { autoAlpha: 0, y: -40, ease: "power1.in" }, 0)
      .to(q("[data-numeral]"), { autoAlpha: 0 }, 0);
  }, { scope: ref });

  const src = "src" in still ? null : still;
  return (
    <div ref={ref} data-chapter={index} className="chapter relative">
      <div className="chapter-stage sticky top-0 flex h-[100svh] items-end overflow-hidden">
        {/* reduced motion: the room as a still image (the live journey stage is not mounted) */}
        <picture aria-hidden className="rm-only absolute inset-0">
          {src && <source media="(max-aspect-ratio: 4/5)" srcSet={sceneSrc(src.id, "tall")} />}
          <img src={src ? sceneSrc(src.id, "wide") : (still as { src: string }).src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </picture>
        <div aria-hidden className="chapter-scrim pointer-events-none absolute inset-0" />
        <span data-numeral aria-hidden className="chapter-numeral pointer-events-none absolute right-[4vw] top-[14svh] select-none font-serif text-[clamp(160px,26vw,420px)] italic leading-none text-transparent">{roman}</span>
        <div className="container-x relative w-full pb-[max(9svh,5.5rem)] lg:pb-[9svh]">
          <div data-copy className="flex flex-col gap-7 will-change-transform">
            <span data-kicker className="eyebrow flex items-center gap-4 text-ice-deep">
              <span className="whitespace-nowrap">Chapter {roman}</span><span data-rule className="block h-px w-10 shrink-0 bg-ice-deep/60 md:w-16" /><span className="text-ice-deep/70">{kicker}</span>
            </span>
            <Headline as="h2" className="display max-w-[11ch] text-[clamp(44px,6.4vw,120px)] leading-[0.88] [text-shadow:0_4px_50px_rgba(0,0,0,0.6)]">{title}</Headline>
            {stats && stats.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-7 sm:flex sm:flex-wrap sm:gap-x-16 sm:gap-y-8">
                {stats.map((s) => (
                  <div key={s.label} data-stat className="flex min-w-0 flex-col gap-2 first:col-span-2 sm:first:col-span-1">
                    <dt className="label text-white/55">{s.label}</dt>
                    <dd className={`tnum display text-[clamp(27px,7vw,42px)] leading-none sm:text-[clamp(32px,3.6vw,60px)] ${s.tone === "gain" ? "text-gain" : s.tone === "loss" ? "text-loss" : ""}`}>
                      {s.count ? <Ticker value={s.count.value} kind={s.count.kind} currency={s.count.currency} /> : s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {note && <p data-note className="max-w-[520px] font-mono text-[12px] leading-[1.8] tracking-[0.04em] text-white/60">{note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
