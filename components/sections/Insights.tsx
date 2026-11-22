import Link from "next/link";
import { insights, insightsAreSamples } from "@/content/insights";
import { dateLong } from "@/lib/format";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import CardArt from "@/components/ui/CardArt";
import { Reveal } from "@/components/ui/Reveal";

export default function Insights() {
  const [feature, ...rest] = insights;
  if (!feature) return null;
  return (
    <section id="insights" aria-labelledby="insights-title" className="container-x relative z-[2] flex flex-col gap-16 pb-36 pt-40">
      <SectionHead index="IV" eyebrow="Market perspective" aside={insightsAreSamples ? <SampleBadge label="Sample articles" force /> : undefined}>
        <span id="insights-title">Notes from the <em>long view.</em></span>
      </SectionHead>
      <div className="flex flex-wrap items-stretch gap-12">
        <Reveal className="flex min-w-0 flex-[1.3_1_520px]">
          <Link href={`/insights/${feature.slug}`} data-cursor="Read" className="group flex min-h-[620px] w-full flex-col overflow-hidden border border-line bg-panel">
            <div className="relative min-h-[340px] flex-1 overflow-hidden bg-[#0E1012]">
              <CardArt kind="feature" viewBox="0 0 600 340" className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105" />
              <span className="absolute left-7 top-6 text-[10px] tracking-[0.28em] text-gold">FEATURE · {feature.tag.toUpperCase()}</span>
            </div>
            <div className="flex flex-col gap-[18px] px-7 py-8">
              <h3 className="font-serif text-[clamp(34px,3.4vw,54px)] leading-[1.02] transition-colors group-hover:text-gold">{feature.title}</h3>
              <p className="max-w-[560px] text-[15px] leading-[1.7] text-silver">{feature.dek}</p>
              <span className="text-[10px] tracking-[0.24em] text-mute">{dateLong(feature.date)} · {feature.readMinutes} MIN</span>
            </div>
          </Link>
        </Reveal>
        <ul className="flex min-w-0 flex-[1_1_380px] flex-col">
          {rest.map((a, i) => (
            <li key={a.slug}>
              <Reveal delay={i * 0.06}>
                <Link href={`/insights/${a.slug}`} data-cursor="Read" className="group flex flex-col gap-3 border-t border-line py-7">
                  <span className="flex justify-between text-[10px] tracking-[0.24em] text-mute"><span className="text-gold">{a.tag.toUpperCase()}</span><span>{dateLong(a.date)} · {a.readMinutes} MIN</span></span>
                  <span className="font-serif text-[30px] leading-[1.08] transition-transform duration-700 ease-[var(--ease-expo)] group-hover:translate-x-4">{a.title}</span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
