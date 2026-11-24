"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import Headline from "@/components/motion/Headline";

const milestones = [
  {
    date: "PRESENT",
    category: "Professional focus",
    title: "Risk & investment analysis",
    description: "A current focus on understanding investment risk, evaluating opportunities and supporting informed portfolio decisions.",
    kind: "current",
  },
  {
    date: "PREVIOUS EXPERIENCE",
    category: "Professional experience",
    title: "Portfolio performance analysis",
    description: "Experience in portfolio performance measurement, monitoring and investment analysis.",
    kind: "work",
  },
  {
    date: "2026",
    category: "Professional development",
    title: "CFA Program · Level II",
    description: "Successfully completed Level II.",
    kind: "study",
  },
  {
    date: "2024",
    category: "Professional development",
    title: "CFA Program · Level I",
    description: "Successfully completed Level I.",
    kind: "study",
  },
  {
    date: "2022 — 2023",
    category: "Education",
    title: "MSc Finance",
    description: "University of Groningen · Research focused on machine-learning-based predictive modelling of M&A outcomes.",
    kind: "education",
  },
  {
    date: "2017 — 2021",
    category: "Education",
    title: "BBA · Business Administration and Management",
    description: "University of Cyprus.",
    kind: "education",
  },
];

/**
 * 06 — THE JOURNEY SO FAR. A vertical timeline.
 * Choreography: the champagne line draws downwards with scroll (scaleY, scrubbed); each milestone pops in — its
 * node scales up, the text rises — the moment the line's tip reaches it, so the line seems to deliver them one by one.
 * The in-progress CFA Level III marker pulses gently. Text never moves once it has arrived.
 */
export default function Experience() {
  const root = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = root.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const track = q("[data-track]")[0] as HTMLElement;
    gsap.fromTo(q("[data-line]"), { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: track, start: "top 62%", end: "bottom 62%", scrub: 0.5 } });
    (q("[data-milestone]") as HTMLElement[]).forEach((m) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: m, start: "top 62%", once: true } });
      tl.from(m.querySelector("[data-node]"), { scale: 0, duration: 0.7, ease: "back.out(2.2)" })
        .from(m.querySelectorAll("[data-pop]"), { y: 22, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.06 }, 0.05);
    });
    gsap.from(q("[data-coda]"), { y: 30, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: q("[data-coda]")[0], start: "top 90%", once: true } });
  }, { scope: root });
  return (
    <section ref={root} id="experience" aria-labelledby="experience-title" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute right-[-16rem] top-20 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(217,192,155,.07),transparent_68%)] blur-2xl" />
      <div className="container-x relative py-32 md:py-40">
        <div className="mb-20 grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div>
            <p className="eyebrow mb-7 flex items-center gap-4 text-ice-deep"><span className="tnum">06</span><span className="block h-px w-10 iris-line" />The journey so far</p>
            <Headline as="h2" id="experience-title" className="display max-w-[1000px] text-[clamp(48px,7vw,112px)] leading-[.92] tracking-[-.035em]">A path of <em className="text-ice-deep">progress.</em></Headline>
          </div>
          <p className="max-w-md text-sm leading-[1.9] text-mute lg:pb-2">A timeline of professional experience, education and continued learning across finance and investment analysis.</p>
        </div>

        <div data-track className="relative mx-auto max-w-5xl">
          <div aria-hidden className="absolute bottom-4 left-[7px] top-3 w-px bg-white/[0.07] md:left-[143px]" />
          <div aria-hidden data-line className="absolute bottom-4 left-[7px] top-3 w-px origin-top bg-gradient-to-b from-ice-deep via-ice-deep/50 to-ice-deep/10 md:left-[143px]" />
          <div className="flex flex-col">
            {milestones.map((item, index) => (
              <div key={item.title} data-milestone>
                <article className="group relative grid grid-cols-[16px_1fr] gap-6 pb-14 last:pb-0 md:grid-cols-[120px_24px_1fr] md:gap-6">
                  <div data-pop className="hidden pt-1 text-right md:block">
                    <span className="font-mono text-[10px] tracking-[.16em] text-white/45">{item.date}</span>
                  </div>
                  <div className="relative flex justify-center">
                    <span data-node className={`relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border transition-colors duration-500 ${item.kind === "current" ? "border-ice-deep bg-ice-deep shadow-[0_0_22px_rgba(217,192,155,.5)]" : "border-white/35 bg-[#101315] group-hover:border-ice-deep"}`} />
                  </div>
                  <div data-pop className="min-w-0 border-b border-white/10 pb-12 transition-colors duration-500 group-hover:border-white/20">
                    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-mono text-[9px] uppercase tracking-[.2em] text-ice-deep/75">{item.category}</span>
                      <span className="h-px w-5 bg-white/15" />
                      <span className="font-mono text-[9px] tracking-[.16em] text-white/35 md:hidden">{item.date}</span>
                      {item.kind === "current" && <span className="flex items-center gap-2 font-mono text-[9px] tracking-[.15em] text-ice-deep"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ice-deep" /> NOW</span>}
                    </div>
                    <h3 className="max-w-3xl font-serif text-[clamp(28px,4vw,48px)] leading-[1.06] tracking-[-.025em] transition-colors duration-300 group-hover:text-ice-deep">{item.title}</h3>
                    <p className="mt-4 max-w-2xl text-sm leading-[1.9] text-mute">{item.description}</p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>

        <div data-coda className="mt-20 flex flex-col gap-5 border-t border-white/10 pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-ice-deep">In progress</p>
            <p className="mt-3 flex items-center gap-4 font-serif text-3xl md:text-4xl"><span aria-hidden className="milestone-live inline-block h-3 w-3 rounded-full bg-ice-deep" />CFA Program <em className="text-ice-deep">· Level III</em></p>
            <p className="mt-2 text-sm text-mute">Continuing the journey toward the charter.</p>
          </div>
          <span className="font-mono text-[9px] tracking-[.2em] text-white/30">A CONTINUOUS PROCESS OF LEARNING</span>
        </div>
      </div>
    </section>
  );
}
