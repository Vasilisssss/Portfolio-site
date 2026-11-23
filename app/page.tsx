import { getPublicView } from "@/lib/public";
import { profile } from "@/content/profile";
import { journal } from "@/content/journal";
import Hero from "@/components/hero/HeadquartersHero";
import Overview from "@/components/sections/Overview";
import Investments from "@/components/sections/Investments";
import Allocation from "@/components/sections/Allocation";
import Performance from "@/components/sections/Performance";
import Strategy from "@/components/sections/Strategy";
import Journal from "@/components/sections/Journal";
import About from "@/components/sections/About";
import Experience from "@/components/sections/Experience";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import { Reveal } from "@/components/ui/Reveal";
import Marquee, { type MarqueeItem } from "@/components/ui/Marquee";
import Chapter from "@/components/world/Chapter";
import TradingFloorAtmosphere from "@/components/world/TradingFloorAtmosphere";
import WorldMount from "@/components/world/WorldMount";
import { worldFromView } from "@/lib/world-data";
import { dateLong, money, moneySigned, monthYear, pct } from "@/lib/format";

export default function Home() {
  const view = getPublicView();
  const on = view.sections;
  const cur = view.baseCurrency;
  const s = view.summary;
  const perf = view.performance;
  const amounts = view.showAmounts && s.value != null;
  const tone = (x: number | null | undefined) => (x == null || Math.abs(x) < 0.0005 ? "flat" : x > 0 ? "gain" : "loss") as "flat" | "gain" | "loss";

  // The scroll film receives exactly the same privacy-filtered portfolio view as the page.
  const { data: worldData, labels } = worldFromView(view);

  const tickerRows: MarqueeItem[][] = [
    view.holdings.map((h): MarqueeItem => ({ label: h.ticker ?? h.name, value: h.returnPct == null ? undefined : pct(h.returnPct, true), tone: tone(h.returnPct) })),
    view.classes.map((c): MarqueeItem => ({ label: c.key, value: pct(c.weight), tone: "flat" })),
  ].filter((r) => r.length > 0);

  const largest = view.holdings[0];
  const jsonLd = { "@context": "https://schema.org", "@type": "ProfilePage", name: profile.siteTitle, description: profile.hero.body, url: profile.url };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WorldMount data={worldData} labels={labels} />

      {/* I — HEADQUARTERS */}
      <div data-scene="0" id="capital-engine" className="relative">
        <Hero name={profile.name} eyebrow={profile.hero.eyebrow} lines={profile.hero.lines} body={profile.hero.body}
          figure={amounts ? { value: money(s.value!, cur), label: `Portfolio value · ${dateLong(view.asOf)}` } : s.returnPct != null ? { value: pct(s.returnPct, true), label: "Total return" } : undefined}
          showInvestments={on.investments && view.holdings.length > 0} />
      </div>

      {/* II — THE TRADING FLOOR */}
      <div data-scene="1" className="trading-floor-scene relative">
        <TradingFloorAtmosphere />
        <Chapter index={1} roman="II" kicker="The Capital Engine" title={<>Every euro <em>flows</em> through here.</>}
          stats={amounts
            ? [{ value: money(s.invested!, cur), label: "In — invested capital" }, { value: money(s.value!, cur), label: "Now — portfolio value" }, { value: moneySigned(s.pnl!, cur), label: "Profit / loss", tone: tone(s.pnl) }]
            : s.returnPct != null ? [{ value: pct(s.returnPct, true), label: "Total return", tone: tone(s.returnPct) }] : []}
          note="A closer look at the investment operation: the portfolio overview, capital flows and the decisions behind each position." />
        {tickerRows.length > 0 && <Marquee rows={tickerRows} />}
        {on.overview && <Overview view={view} />}
      </div>

      {/* III — THE INVESTMENT COLLECTION */}
      <div data-scene="2" className="relative">
        <Chapter index={2} roman="III" kicker="The Investment Gallery" title={<>A gallery of <em>positions.</em></>}
          stats={[
            { value: String(s.positions || view.holdings.length), label: "Positions" },
            { value: String(s.classes), label: "Asset classes" },
            ...(largest ? [{ value: `${largest.ticker ?? largest.name} ${pct(largest.weight)}`, label: "Largest position" }] : []),
          ]}
          note="A clear view of every position, its weight in the portfolio and the role it plays in the wider allocation." />
        {on.investments && view.holdings.length > 0 && (
          <section id="investments" aria-labelledby="investments-title" className="container-x relative flex flex-col gap-14 py-24">
            <SectionHead index="02" eyebrow="My investments" id="investments-title" aside={<SampleBadge show={view.sample} />}>
              What I <em>own,</em> and why.
            </SectionHead>
            <Investments holdings={view.holdings} currency={cur} />
          </section>
        )}
        {on.allocation && (
          <section id="allocation" aria-labelledby="allocation-title" className="container-x relative flex flex-col gap-14 py-24">
            <SectionHead index="03" eyebrow="Asset allocation" id="allocation-title"
              aside={<p className="max-w-[320px] text-sm leading-[1.7] text-mute">How my capital is distributed, by asset class, investment, geography, industry and currency.</p>}>
              Capital, <em>in proportion.</em>
            </SectionHead>
            <Reveal><Allocation allocation={view.allocation} currency={cur} /></Reveal>
          </section>
        )}
      </div>

      {/* IV — PERFORMANCE */}
      <div data-scene="3" className="relative">
        <Chapter index={3} roman="IV" kicker="The Performance Gallery" title={<>Looking back, <em>honestly.</em></>}
          stats={perf ? [
            { value: pct(perf.twr, true), label: "Time-weighted return", tone: tone(perf.twr) },
            { value: `${monthYear(perf.points[0].date)} → ${monthYear(perf.points[perf.points.length - 1].date)}`, label: "Period" },
          ] : []}
          note="A transparent record of portfolio performance, measured over time and distinguished from deposits and withdrawals." />
        {on.performance && (
          <section id="performance" aria-labelledby="performance-title" className="container-x relative flex flex-col gap-14 py-24">
            <SectionHead index="04" eyebrow="Performance" id="performance-title" aside={<SampleBadge show={view.sample} />}>
              Returns, <em>not deposits.</em>
            </SectionHead>
            {perf ? (
              <Performance perf={perf} holdings={view.holdings} amounts={view.showAmounts} currency={cur} />
            ) : (
              <p className="glass rounded-[24px] p-10 text-mute">Performance appears once month-end history is added (see data/README.md).</p>
            )}
            <p className="font-mono text-[11px] tracking-[0.06em] text-mute">Data as of {dateLong(view.asOf)}{view.source ? ` · ${view.source}` : ""}.</p>
          </section>
        )}
        {on.journal && <Journal entries={journal} />}
      </div>

      {/* V — INVESTMENT PHILOSOPHY AND ABOUT */}
      <div data-scene="4" className="relative">
        <Chapter index={4} roman="V" kicker="The Final Reveal" title={<>What I&apos;m <em>building.</em></>}
          note="How I think about money, risk and time — and where this portfolio is going next." />
        {on.strategy && <Strategy s={profile.strategy} />}
        {on.experience && <Experience />}
        {on.about && <About />}
      </div>
    </>
  );
}
