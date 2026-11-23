"use client";

import { useState } from "react";
import { Reveal, RevealText } from "@/components/ui/Reveal";

const roles = [
  { period: "NOV 2026 — PRESENT", year: "2026", role: "Risk Analyst", firm: "Argus Management Ltd.", place: "Nicosia, Cyprus", detail: "Risk analysis", current: true, mark: "A" },
  { period: "SEP 2023 — OCT 2026", year: "2023", role: "Portfolio Performance Analyst", firm: "Albourne", place: "Nicosia, Cyprus", detail: "Portfolio performance · Hedge funds · Private markets", mark: "AL" },
];
const education = [
  { period: "2022 — 2023", degree: "MSc Finance", school: "University of Groningen", detail: "Grade: 7/10 · Thesis: machine-learning-based predictive modelling of M&A outcomes", mark: "RUG" },
  { period: "2017 — 2021", degree: "BBA, Business Administration and Management", school: "University of Cyprus", detail: "Business Administration and Management", mark: "UCY" },
];
const credentials = [
  { name: "CFA Program — Level II", issuer: "CFA Institute", date: "JAN 2026", state: "Completed" },
  { name: "CFA Program — Level I", issuer: "CFA Institute", date: "APR 2024", state: "Completed" },
  { name: "CFA Program — Level III Candidate", issuer: "CFA Institute", date: "IN PROGRESS", state: "Current" },
];

function TimelineHeading({ index, children }: { index: string; children: React.ReactNode }) {
  return <div className="mb-8 flex items-center gap-4"><span className="font-mono text-[10px] tracking-[.2em] text-lime">{index}</span><span className="h-px w-8 bg-lime/50" /><h3 className="eyebrow text-ice-deep">{children}</h3></div>;
}

export default function Experience() {
  const [expanded, setExpanded] = useState<string | null>("Albourne");
  return (
    <section id="experience" aria-labelledby="experience-title" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute right-[-16rem] top-20 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(215,255,63,.075),transparent_68%)] blur-2xl" />
      <div className="container-x relative flex flex-col gap-20 py-32 md:py-40">
        <div className="grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[1fr_.55fr] lg:items-end">
          <div>
            <p className="eyebrow mb-7 flex items-center gap-4 text-ice-deep"><span className="tnum">06</span><span className="block h-px w-10 iris-line" />Career / education / credentials</p>
            <RevealText as="h2" id="experience-title" className="display max-w-[1000px] text-[clamp(48px,7vw,112px)] leading-[.92] tracking-[-.035em]">A career in <em className="text-lime">perspective.</em></RevealText>
          </div>
          <div className="flex flex-col gap-5 lg:pb-2">
            <p className="max-w-md text-sm leading-[1.9] text-mute">A professional path shaped by portfolio performance, risk analysis and a continuing commitment to financial education.</p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 px-4 py-2 font-mono text-[9px] tracking-[.16em] text-white/60">NICOSIA · CYPRUS</span>
              <span className="rounded-full border border-lime/25 px-4 py-2 font-mono text-[9px] tracking-[.16em] text-lime">CFA LEVEL III CANDIDATE</span>
            </div>
          </div>
        </div>

        <div className="grid gap-20 xl:grid-cols-[1.15fr_.85fr]">
          <div>
            <TimelineHeading index="01">Professional experience</TimelineHeading>
            <div className="relative ml-3 border-l border-white/10 pl-8 md:ml-5 md:pl-12">
              <span aria-hidden className="absolute -left-px top-0 h-full w-px bg-gradient-to-b from-lime/80 via-lime/25 to-transparent" />
              {roles.map((r, i) => {
                const isOpen = expanded === r.firm;
                return (
                  <article key={r.firm} className="relative pb-8 last:pb-0">
                    <span aria-hidden className={`absolute -left-[37px] top-8 h-3 w-3 rounded-full border ${r.current ? "border-lime bg-lime shadow-[0_0_20px_rgba(215,255,63,.65)]" : "border-white/30 bg-[#101315]"} md:-left-[53px]`} />
                    <div className={`group relative overflow-hidden rounded-[26px] border transition-all duration-500 ${isOpen ? "border-lime/25 bg-white/[.055]" : "border-white/10 bg-white/[.025] hover:border-white/20"}`}>
                      <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-48 w-48 bg-[radial-gradient(circle_at_top_right,rgba(215,255,63,.09),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="relative p-6 md:p-8">
                        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                          <span className="font-mono text-[10px] tracking-[.18em] text-mute">{r.period}</span>
                          {r.current ? <span className="flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[.07] px-3 py-1.5 font-mono text-[9px] tracking-[.15em] text-lime"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> CURRENT ROLE</span> : <span className="font-mono text-[9px] tracking-[.16em] text-white/30">0{i + 1} / PREVIOUS</span>}
                        </div>
                        <div className="flex items-start gap-5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 font-serif text-xl text-lime/90">{r.mark}</div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-serif text-[clamp(27px,3vw,40px)] leading-[1.04] tracking-[-.02em]">{r.role}</h4>
                            <p className="mt-2 text-[15px] text-white/75">{r.firm}</p>
                            <p className="mt-1 text-xs tracking-wide text-mute">{r.place}</p>
                          </div>
                        </div>
                        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
                          <span className="font-mono text-[9px] uppercase tracking-[.18em] text-white/35">Role overview</span>
                          {r.current ? <span className="text-xs text-mute">{r.detail}</span> : (
                            <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : r.firm)} className="flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-lime transition-colors hover:text-white">
                              {isOpen ? "Close details" : "Explore role"} <span className={`text-lg transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>+</span>
                            </button>
                          )}
                        </div>
                        {r.current && <p className="mt-4 text-sm leading-[1.8] text-mute">Current position in risk analysis.</p>}
                        {!r.current && <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden"><div className="mt-5 border-l border-lime/30 pl-5"><p className="max-w-xl text-sm leading-[1.9] text-mute">Portfolio performance analysis across hedge funds and private markets, including performance monitoring, risk metrics, client reporting and reconciliation of investment data.</p><div className="mt-5 flex flex-wrap gap-2">{["Portfolio performance","Hedge funds","Private markets","Risk metrics","Client reporting"].map(tag => <span key={tag} className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] tracking-[.1em] text-white/45">{tag}</span>)}</div></div></div></div>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-16">
            <div>
              <TimelineHeading index="02">Education</TimelineHeading>
              <div className="flex flex-col gap-3">
                {education.map((e, i) => (
                  <Reveal key={e.school}>
                    <article className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[.025] p-6 transition-colors duration-500 hover:border-white/20 md:p-7">
                      <div className="flex items-start justify-between gap-5">
                        <span className="font-mono text-[10px] tracking-[.16em] text-mute">{e.period}</span>
                        <span className="font-mono text-[10px] tracking-[.12em] text-lime/65">{e.mark}</span>
                      </div>
                      <h4 className="mt-7 font-serif text-[clamp(25px,2.8vw,34px)] leading-[1.05]">{e.degree}</h4>
                      <p className="mt-3 text-sm text-white/70">{e.school}</p>
                      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-[1.8] text-mute">{e.detail}</p>
                      <span aria-hidden className="absolute bottom-0 left-0 h-px w-0 bg-lime transition-all duration-700 group-hover:w-full" />
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>

            <div>
              <TimelineHeading index="03">CFA Program</TimelineHeading>
              <div className="relative rounded-[26px] border border-white/10 bg-white/[.025] p-6 md:p-7">
                <div className="mb-7 flex items-center justify-between gap-4">
                  <div><p className="font-serif text-2xl">Progression</p><p className="mt-1 text-xs text-mute">CFA Institute</p></div>
                  <span className="rounded-full border border-lime/25 px-3 py-1.5 font-mono text-[9px] tracking-[.16em] text-lime">LEVEL III</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["I","II","III"].map((level,i)=><div key={level} className={`relative flex min-h-[88px] flex-col justify-between rounded-xl border p-3 ${i<2 ? "border-white/15 bg-white/[.045]" : "border-lime/35 bg-lime/[.07]"}`}><span className="font-serif text-3xl">{level}</span><span className={`font-mono text-[8px] tracking-[.12em] ${i<2 ? "text-white/45" : "text-lime"}`}>{i<2 ? "PASSED" : "CANDIDATE"}</span></div>)}
                </div>
                <div className="mt-6 flex flex-col">
                  {credentials.map((c) => (
                    <div key={c.name} className="flex items-start justify-between gap-4 border-t border-white/10 py-4 first:border-0">
                      <div><p className="text-sm text-white/80">{c.name}</p><p className="mt-1 text-[11px] text-mute">{c.issuer}</p></div>
                      <span className="shrink-0 pt-1 font-mono text-[9px] tracking-[.12em] text-white/40">{c.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-7">
          <p className="font-serif text-xl italic text-white/55">Experience is a continuous process.</p>
          <span className="font-mono text-[9px] tracking-[.2em] text-white/30">VASILIS MAVROUDES · CAREER TIMELINE</span>
        </div>
      </div>
    </section>
  );
}
