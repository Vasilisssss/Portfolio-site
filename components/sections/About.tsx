import { profile } from "@/content/profile";
import Headline from "@/components/motion/Headline";
import Rise from "@/components/motion/Rise";

/**
 * 07 — a minimal personal introduction. Every line comes from content/profile.ts; nothing is invented.
 * Choreography: the introduction reveals line by line and drifts; the three notes rise in sequence. Empty or
 * placeholder notes ("—") are not shown.
 */
export default function About() {
  const a = profile.about;
  const blocks = [
    { label: "My approach", text: a.approach },
    { label: "Long-term vision", text: a.vision },
    { label: "Professional development", text: a.started },
  ].filter((b) => b.text && b.text.trim() !== "—");
  return (
    <section id="about" aria-labelledby="about-title" className="relative">
      <div className="container-x flex flex-col gap-20 py-32">
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-[1_1_260px] flex-col gap-6">
            <h2 id="about-title" className="eyebrow flex items-center gap-4 text-ice-deep"><span className="tnum">07</span><span className="block h-px w-10 iris-line" />About</h2>
            <p className="font-serif text-[30px]">{profile.name}</p>
          </div>
          <Headline as="p" className="display flex-[3_1_620px] text-[clamp(34px,4vw,64px)] leading-[1.1]">{a.intro}</Headline>
        </div>
        <Rise stagger={0.1} className={`grid grid-cols-1 gap-4 ${blocks.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {blocks.map((b) => (
              <div key={b.label} data-rise className="glass flex flex-col gap-4 rounded-[24px] p-8">
                <h3 className="label">{b.label}</h3>
                <p className="font-serif text-[24px] leading-[1.3]">{b.text}</p>
              </div>
            ))}
        </Rise>
      </div>
    </section>
  );
}
