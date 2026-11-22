import { profile } from "@/content/profile";
import { RevealText, Reveal } from "@/components/ui/Reveal";

/** 07 — a minimal personal introduction. Every line comes from content/profile.ts; nothing is invented. */
export default function About() {
  const a = profile.about;
  const blocks = [
    { label: "My approach", text: a.approach },
    { label: "Long-term vision", text: a.vision },
    { label: "Investing since", text: a.started },
  ];
  return (
    <section id="about" aria-labelledby="about-title" className="relative">
      <div className="container-x flex flex-col gap-20 py-32">
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-[1_1_260px] flex-col gap-6">
            <h2 id="about-title" className="eyebrow flex items-center gap-4 text-ice-deep"><span className="tnum">07</span><span className="block h-px w-10 iris-line" />About</h2>
            <p className="font-serif text-[30px]">{profile.name}</p>
          </div>
          <RevealText as="p" className="display flex-[3_1_620px] text-[clamp(34px,4vw,64px)] leading-[1.1]">{a.intro}</RevealText>
        </div>
        <Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {blocks.map((b) => (
              <div key={b.label} className="glass flex flex-col gap-4 rounded-[24px] p-8">
                <h3 className="label">{b.label}</h3>
                <p className="font-serif text-[24px] leading-[1.3]">{b.text}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
