import { getPublicView } from "@/lib/public";
import { profile } from "@/content/profile";
import { journal } from "@/content/journal";
import Hero from "@/components/hero/Hero";
import Overview from "@/components/sections/Overview";
import Investments from "@/components/sections/Investments";
import Allocation from "@/components/sections/Allocation";
import Performance from "@/components/sections/Performance";
import Strategy from "@/components/sections/Strategy";
import Journal from "@/components/sections/Journal";
import About from "@/components/sections/About";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import { Reveal } from "@/components/ui/Reveal";
import { dateLong } from "@/lib/format";

export default function Home() {
  const view = getPublicView();
  const on = view.sections;
  const jsonLd = { "@context": "https://schema.org", "@type": "ProfilePage", name: profile.siteTitle, description: profile.hero.body, url: profile.url };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero eyebrow={profile.hero.eyebrow} lines={profile.hero.lines} body={profile.hero.body}
        orbs={view.classes.map((c) => ({ key: c.key, weight: c.weight }))} showInvestments={on.investments && view.holdings.length > 0} />

      {on.overview && <Overview view={view} />}

      {on.investments && view.holdings.length > 0 && (
        <section id="investments" aria-labelledby="investments-title" className="container-x relative flex flex-col gap-14 py-24">
          <SectionHead index="02" eyebrow="My investments" id="investments-title" aside={<SampleBadge show={view.sample} />}>
            What I <em>own,</em> and why.
          </SectionHead>
          <Investments holdings={view.holdings} currency={view.baseCurrency} />
        </section>
      )}

      {on.allocation && (
        <section id="allocation" aria-labelledby="allocation-title" className="container-x relative flex flex-col gap-14 py-24">
          <SectionHead index="03" eyebrow="Asset allocation" id="allocation-title"
            aside={<p className="max-w-[320px] text-sm leading-[1.7] text-mute">How my capital is distributed, by asset class, investment, geography, industry and currency.</p>}>
            Capital, <em>in proportion.</em>
          </SectionHead>
          <Reveal><Allocation allocation={view.allocation} currency={view.baseCurrency} /></Reveal>
        </section>
      )}

      {on.performance && (
        <section id="performance" aria-labelledby="performance-title" className="container-x relative flex flex-col gap-14 py-24">
          <SectionHead index="04" eyebrow="Performance" id="performance-title" aside={<SampleBadge show={view.sample} />}>
            Returns, <em>not deposits.</em>
          </SectionHead>
          {view.performance ? (
            <Performance perf={view.performance} holdings={view.holdings} amounts={view.showAmounts} currency={view.baseCurrency} />
          ) : (
            <p className="glass rounded-[24px] p-10 text-mute">Performance appears once month-end history is added (see data/README.md).</p>
          )}
          <p className="text-[12px] text-mute">Data as of {dateLong(view.asOf)}.</p>
        </section>
      )}

      {on.strategy && <Strategy s={profile.strategy} />}
      {on.journal && <Journal entries={journal} />}
      {on.about && <About />}
    </>
  );
}
