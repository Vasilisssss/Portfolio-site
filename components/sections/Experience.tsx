"use client";

import { Reveal, RevealText } from "@/components/ui/Reveal";

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

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute right-[-16rem] top-20 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(215,255,63,.075),transparent_68%)] blur-2xl" />
      <div className="container-x relative py-32 md:py-40">
        <div className="mb-20 grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div>
            <p className="eyebrow mb-7 flex items-center gap-4 text-ice-deep"><span className="tnum">06</span><span className="block h-px w-10 iris-line" />The journey so far</p>
            <RevealText as="h2" id="experience-title" className="display max-w-[1000px] text-[clamp(48px,7vw,112px)] leading-[.92] tracking-[-.035em]">A path of <em className="text-lime">progress.</em></RevealText>
          </div>
          <p className="max-w-md text-sm leading-[1.9] text-mute lg:pb-2">A timeline of professional experience, education and continued learning across finance and investment analysis.</p>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div aria-hidden className="absolute bottom-4 left-[7px] top-3 w-px bg-gradient-to-b from-lime via-white/15 to-transparent md:left-[143px]" />
          <div className="flex flex-col">
            {milestones.map((item, index) => (
              <Reveal key={item.title}>
                <article className="group relative grid grid-cols-[16px_1fr] gap-6 pb-14 last:pb-0 md:grid-cols-[120px_24px_1fr] md:gap-6">
                  <div className="hidden pt-1 text-right md:block">
                    <span className="font-mono text-[10px] tracking-[.16em] text-white/45">{item.date}</span>
                  </div>
                  <div className="relative flex justify-center">
                    <span className={`relative z-10 mt-1.5 h-[15px] w-[15px] rounded-full border transition-all duration-500 group-hover:scale-125 ${item.kind === "current" ? "border-lime bg-lime shadow-[0_0_22px_rgba(215,255,63,.55)]" : "border-white/35 bg-[#101315] group-hover:border-lime"}`} />
                  </div>
                  <div className="min-w-0 border-b border-white/10 pb-12 transition-colors duration-500 group-hover:border-white/20">
                    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-mono text-[9px] uppercase tracking-[.2em] text-lime/75">{item.category}</span>
                      <span className="h-px w-5 bg-white/15" />
                      <span className="font-mono text-[9px] tracking-[.16em] text-white/35 md:hidden">{item.date}</span>
                      {item.kind === "current" && <span className="flex items-center gap-2 font-mono text-[9px] tracking-[.15em] text-lime"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> NOW</span>}
                    </div>
                    <h3 className="max-w-3xl font-serif text-[clamp(28px,4vw,48px)] leading-[1.06] tracking-[-.025em] transition-colors duration-300 group-hover:text-lime">{item.title}</h3>
                    <p className="mt-4 max-w-2xl text-sm leading-[1.9] text-mute">{item.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-5 border-t border-white/10 pt-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-ice-deep">In progress</p>
            <p className="mt-3 font-serif text-3xl md:text-4xl">CFA Program <em className="text-lime">· Level III</em></p>
            <p className="mt-2 text-sm text-mute">Continuing the journey toward the charter.</p>
          </div>
          <span className="font-mono text-[9px] tracking-[.2em] text-white/30">A CONTINUOUS PROCESS OF LEARNING</span>
        </div>
      </div>
    </section>
  );
}
