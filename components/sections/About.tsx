import { about } from "@/content/site";
import { RevealText, Reveal } from "@/components/ui/Reveal";

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative z-[2] border-t border-line">
      <div className="container-x flex flex-col gap-24 py-36">
        <div className="flex flex-wrap gap-16">
          <div className="flex flex-[1_1_280px] flex-col gap-6">
            <h2 id="about-title" className="eyebrow text-gold">V — About</h2>
            <p className="max-w-[300px] text-[13px] leading-[1.8] text-silver">{about.background}</p>
          </div>
          <RevealText as="p" className="display flex-[3_1_640px] text-[clamp(36px,4.2vw,68px)] leading-[1.08] tracking-[-0.01em]">
            {about.statement[0]}<em className="text-gold">{about.statement[1]}</em>{about.statement[2]}
          </RevealText>
        </div>
        <Reveal>
          <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            {about.blocks.map((b) => (
              <div key={b.label} className="flex flex-col gap-4 bg-ink p-9">
                <h3 className="label text-mute">{b.label}</h3>
                <p className="font-serif text-[28px] leading-[1.2]">{b.text}</p>
              </div>
            ))}
            <div className="flex flex-col gap-4 bg-ink p-9">
              <h3 className="label text-mute">Expertise</h3>
              <ul className="flex flex-col gap-2.5 text-sm text-ivory-dim">{about.expertise.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className="flex flex-col gap-4 bg-ink p-9">
              <h3 className="label text-mute">Objectives</h3>
              <ul className="flex flex-col gap-2.5 text-sm text-ivory-dim">{about.objectives.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
