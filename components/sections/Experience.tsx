import { Reveal, RevealText } from "@/components/ui/Reveal";

const roles = [
  { period: "NOV 2026 — PRESENT", role: "Risk Analyst", firm: "Argus Management Ltd.", place: "Nicosia, Cyprus", detail: "Risk analysis", current: true },
  { period: "SEP 2023 — OCT 2026", role: "Portfolio Performance Analyst", firm: "Albourne", place: "Nicosia, Cyprus", detail: "Portfolio performance · Hedge funds · Private markets" },
];
const education = [
  { period: "SEP 2022 — JUN 2023", degree: "MSc Finance", school: "University of Groningen", detail: "Grade: 7/10 · Thesis: machine-learning-based predictive modelling of M&A outcomes" },
  { period: "2017 — 2021", degree: "BBA, Business Administration and Management", school: "University of Cyprus", detail: "Business Administration and Management" },
];
const credentials = [
  { name: "CFA Program — Level II", issuer: "CFA Institute", date: "JAN 2026" },
  { name: "CFA Program — Level I", issuer: "CFA Institute", date: "APR 2024" },
  { name: "CFA Program — Level III Candidate", issuer: "CFA Institute", date: "CURRENTLY PURSUING" },
];

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className="relative">
      <div className="container-x flex flex-col gap-16 py-28">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-3xl">
            <p className="eyebrow mb-6 flex items-center gap-4 text-ice-deep"><span className="tnum">06</span><span className="block h-px w-10 iris-line" />Career & credentials</p>
            <RevealText as="h2" id="experience-title" className="display text-[clamp(42px,6vw,84px)] leading-[.98]">A foundation in <em>finance.</em></RevealText>
          </div>
          <p className="max-w-sm text-sm leading-[1.8] text-mute">Professional experience across portfolio performance and risk, supported by postgraduate finance education and CFA Program progression.</p>
        </div>
        <div className="grid gap-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <h3 className="eyebrow mb-8 text-ice-deep">01 / Experience</h3>
            <div className="border-t border-line">
              {roles.map((r) => (
                <Reveal key={r.firm}>
                  <article className="grid gap-4 border-b border-line py-8 sm:grid-cols-[150px_1fr]">
                    <p className="font-mono text-[10px] tracking-[.14em] text-mute">{r.period}</p>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-serif text-[clamp(25px,3vw,34px)] leading-tight">{r.role}</h4>
                        {r.current && <span className="rounded-full border border-lime/30 px-3 py-1 font-mono text-[9px] uppercase tracking-[.16em] text-lime">Current</span>}
                      </div>
                      <p className="mt-2 text-[15px] text-graphite-2">{r.firm}</p>
                      <p className="mt-1 text-xs text-mute">{r.place}</p>
                      {r.current ? (
                        <p className="mt-4 text-sm leading-relaxed text-mute">{r.detail}</p>
                      ) : (
                        <details className="group mt-4">
                          <summary className="flex w-fit cursor-pointer list-none items-center gap-3 text-[11px] uppercase tracking-[.18em] text-lime marker:hidden">
                            Explore role <span aria-hidden className="transition-transform group-open:rotate-45">+</span>
                          </summary>
                          <div className="mt-4 max-w-xl border-l border-lime/30 pl-5">
                            <p className="text-sm leading-[1.8] text-mute">Portfolio performance analysis across hedge funds and private markets, including performance monitoring, risk metrics, client reporting and reconciliation of investment data.</p>
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-14">
            <div>
              <h3 className="eyebrow mb-8 text-ice-deep">02 / Education</h3>
              <div className="border-t border-line">
                {education.map((e) => (
                  <article key={e.school} className="border-b border-line py-8">
                    <p className="font-mono text-[10px] tracking-[.14em] text-mute">{e.period}</p>
                    <h4 className="mt-3 font-serif text-[26px] leading-tight">{e.degree}</h4>
                    <p className="mt-2 text-[15px] text-graphite-2">{e.school}</p>
                    <p className="mt-4 text-sm leading-relaxed text-mute">{e.detail}</p>
                  </article>
                ))}
              </div>
            </div>
            <div>
              <h3 className="eyebrow mb-8 text-ice-deep">03 / CFA Program</h3>
              <div className="border-t border-line">
                {credentials.map((c) => (
                  <div key={c.name} className="flex items-start justify-between gap-5 border-b border-line py-5">
                    <div><p className="font-serif text-[21px]">{c.name}</p><p className="mt-1 text-sm text-mute">{c.issuer}</p></div>
                    <span className="shrink-0 pt-1 font-mono text-[9px] tracking-[.12em] text-mute">{c.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
