import { getPublicView } from "@/lib/public";
import { profile } from "@/content/profile";
import Hero from "@/components/hero/HeadquartersHero";
import Overview from "@/components/sections/Overview";
import Investments from "@/components/sections/Investments";
import Allocation from "@/components/sections/Allocation";
import Performance from "@/components/sections/Performance";
import Strategy from "@/components/sections/Strategy";
import About from "@/components/sections/About";
import Experience from "@/components/sections/Experience";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import Marquee, { type MarqueeItem } from "@/components/ui/Marquee";
import Rise from "@/components/motion/Rise";
import ClipReveal from "@/components/motion/ClipReveal";
import Stack, { Sheet } from "@/components/motion/Stack";
import Journey from "@/components/journey/Journey";
import Chapter, { type ChapterStat } from "@/components/journey/Chapter";
import ViewingWindow, { type WindowFrame } from "@/components/journey/ViewingWindow";
import { ROOMS, CLOSING, WALK, walkSrc } from "@/components/journey/scenes";
import { dateLong, money, moneySigned, monthYear, pct } from "@/lib/format";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export default function Home() {
  const view = getPublicView();
  const on = view.sections;
  const cur = view.baseCurrency;
  const s = view.summary;
  const perf = view.performance;
  const amounts = view.showAmounts && s.value != null;
  const tone = (x: number | null | undefined) => (x == null || Math.abs(x) < 0.0005 ? "flat" : x > 0 ? "gain" : "loss") as "flat" | "gain" | "loss";
  const room = (id: string) => ROOMS.find((r) => r.id === id)!;

  const tickerRows: MarqueeItem[][] = [
    view.holdings.map((h): MarqueeItem => ({ label: h.ticker ?? h.name, value: h.returnPct == null ? undefined : pct(h.returnPct, true), tone: tone(h.returnPct) })),
    view.classes.map((c): MarqueeItem => ({ label: c.key, value: pct(c.weight), tone: "flat" })),
  ].filter((r) => r.length > 0);

  const largest = view.holdings[0];
  const capitalStats: ChapterStat[] = amounts
    ? [
        { value: money(s.invested!, cur), label: "In — invested capital", count: { value: s.invested!, kind: "money", currency: cur } },
        { value: money(s.value!, cur), label: "Now — portfolio value", count: { value: s.value!, kind: "money", currency: cur } },
        { value: moneySigned(s.pnl!, cur), label: "Profit / loss", tone: tone(s.pnl), count: { value: s.pnl!, kind: "moneySigned", currency: cur } },
      ]
    : s.returnPct != null ? [{ value: pct(s.returnPct, true), label: "Total return", tone: tone(s.returnPct), count: { value: s.returnPct, kind: "pctSigned" } }] : [];
  const period = perf ? `${monthYear(perf.points[0].date)} → ${monthYear(perf.points[perf.points.length - 1].date)}` : "";

  // The Window: the whole journey replayed through one frame. At most one real figure per stop, privacy-filtered.
  const windowFrames: WindowFrame[] = [
    { kind: "walk", src: walkSrc(WALK.poster), srcSm: walkSrc(WALK.posterSm), alt: "The headquarters at blue hour", focusX: 0.5, roman: "I", name: "Headquarters" },
    { kind: "room", id: "screens", alt: room("screens").alt, focusX: room("screens").focusX, roman: "II", name: "The Capital Engine",
      figure: amounts ? { label: "Portfolio value", value: money(s.value!, cur) } : s.returnPct != null ? { label: "Total return", value: pct(s.returnPct, true) } : undefined },
    { kind: "room", id: "gallery", alt: room("gallery").alt, focusX: room("gallery").focusX, roman: "III", name: "The Investment Gallery",
      figure: { label: "Positions", value: String(s.positions || view.holdings.length) } },
    { kind: "room", id: "chart", alt: room("chart").alt, focusX: room("chart").focusX, roman: "IV", name: "The Performance Gallery",
      figure: perf ? { label: `Time-weighted · ${period}`, value: pct(perf.twr, true) } : undefined },
    { kind: "room", id: "skyline", alt: room("skyline").alt, focusX: room("skyline").focusX, roman: "V", name: "The Final Reveal" },
  ];

  // strategy downloads: a card links to its file only once the file is in public/ (checked at build time)
  const documents = profile.strategy.documents.map((d) => {
    const path = join(process.cwd(), "public", d.file);
    const ready = existsSync(path);
    const kb = ready ? statSync(path).size / 1024 : 0;
    return { title: d.title, body: d.body, format: d.format, href: ready ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${d.file}` : undefined,
      size: ready ? (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`) : undefined };
  });

  const jsonLd = { "@context": "https://schema.org", "@type": "ProfilePage", name: profile.siteTitle, description: profile.hero.body, url: profile.url };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Journey />

      {/* I — THE HEADQUARTERS: scrolling walks up to the building, through its doors and onto the trading floor */}
      <div data-scene="0" className="relative">
        <Hero name={profile.name} eyebrow={profile.hero.eyebrow} lines={profile.hero.lines} body={profile.hero.body}
          figure={amounts ? { value: money(s.value!, cur), label: `Portfolio value · ${dateLong(view.asOf)}` } : s.returnPct != null ? { value: pct(s.returnPct, true), label: "Total return" } : undefined}
          showInvestments={on.investments && view.holdings.length > 0} />
      </div>

      {/* II — THE CAPITAL ENGINE */}
      <div data-scene="1" id="capital-engine" className="relative">
        <Chapter index={1} roman="II" kicker="The Capital Engine" title={<>Every euro <em>flows</em> through here.</>}
          still={{ src: walkSrc(WALK.last), alt: "The trading floor" }} stats={capitalStats}
          note="The screens hold the portfolio as it stands: what I have put in, what it is worth today, and the difference between the two." />
        <Stack>
          <Sheet>
            {tickerRows.length > 0 && <Marquee rows={tickerRows} />}
            {on.overview && <Overview view={view} />}
          </Sheet>
        </Stack>
      </div>

      {/* III — THE INVESTMENT GALLERY */}
      <div data-scene="2" className="relative">
        <Chapter index={2} roman="III" kicker="The Investment Gallery" title={<>A gallery of <em>positions.</em></>}
          still={{ id: "gallery", alt: room("gallery").alt, focusX: room("gallery").focusX }}
          stats={[
            { value: String(s.positions || view.holdings.length), label: "Positions", count: { value: s.positions || view.holdings.length, kind: "int" } },
            { value: String(s.classes), label: "Asset classes", count: { value: s.classes, kind: "int" } },
            ...(largest ? [{ value: `${largest.ticker ?? largest.name} ${pct(largest.weight)}`, label: "Largest position" }] : []),
          ]}
          note="Every position I hold, its weight in the portfolio and what it has returned since I bought it." />
        <Stack>
          {on.investments && view.holdings.length > 0 && (
            <Sheet id="investments" aria-labelledby="investments-title">
              <section className="container-x relative flex flex-col gap-14 py-24">
                <SectionHead index="02" eyebrow="My investments" id="investments-title" aside={<SampleBadge show={view.sample} />}>
                  What I <em>own.</em>
                </SectionHead>
                <Investments holdings={view.holdings} currency={cur} />
              </section>
            </Sheet>
          )}
          {on.allocation && (
            <Sheet id="allocation" aria-labelledby="allocation-title">
              <section className="container-x relative flex flex-col gap-14 py-24">
                <SectionHead index="03" eyebrow="Asset allocation" id="allocation-title"
                  aside={<Rise><p className="max-w-[320px] text-sm leading-[1.7] text-mute">How my capital is distributed, by asset class, investment, geography, industry and currency.</p></Rise>}>
                  Capital, <em>in proportion.</em>
                </SectionHead>
                <ClipReveal className="rounded-[28px]" parallax={0} scale={1.04}><Allocation allocation={view.allocation} currency={cur} /></ClipReveal>
              </section>
            </Sheet>
          )}
        </Stack>
      </div>

      {/* IV — THE PERFORMANCE GALLERY */}
      <div data-scene="3" className="relative">
        <Chapter index={3} roman="IV" kicker="The Performance Gallery" title={<>Looking back, <em>honestly.</em></>}
          still={{ id: "chart", alt: room("chart").alt, focusX: room("chart").focusX }}
          stats={perf ? [
            { value: pct(perf.twr, true), label: "Time-weighted return", tone: tone(perf.twr), count: { value: perf.twr, kind: "pctSigned" } },
            { value: period, label: "Period" },
          ] : []}
          note="Measured month by month and time-weighted, so the money I deposit or withdraw never counts as performance." />
        <Stack>
          {on.performance && (
            <Sheet id="performance" aria-labelledby="performance-title">
              <section className="container-x relative flex flex-col gap-14 py-24">
                <SectionHead index="04" eyebrow="Performance" id="performance-title" aside={<SampleBadge show={view.sample} />}>
                  Returns, <em>not deposits.</em>
                </SectionHead>
                {perf ? (
                  <Performance perf={perf} holdings={view.holdings} amounts={view.showAmounts} currency={cur} />
                ) : (
                  <p className="glass rounded-[24px] p-10 text-mute">Performance appears once month-end history is added (see data/README.md).</p>
                )}
                <Rise><p className="font-mono text-[11px] tracking-[0.06em] text-mute">Data as of {dateLong(view.asOf)}{view.source ? ` · ${view.source}` : ""}.</p></Rise>
              </section>
            </Sheet>
          )}
        </Stack>
      </div>

      {/* V — THE FINAL REVEAL: the skyline, then the whole journey through one window, then the thinking behind it */}
      <div data-scene="4" className="relative">
        <Chapter index={4} roman="V" kicker="The Final Reveal" title={<>What I&apos;m <em>building.</em></>}
          still={{ id: "skyline", alt: room("skyline").alt, focusX: room("skyline").focusX }}
          note="How I think about money, risk and time, and where this portfolio goes next." />
        <ViewingWindow frames={windowFrames} closing={{ id: CLOSING.id, alt: CLOSING.alt, focusX: CLOSING.focusX }} />
        <Stack>
          {on.strategy && <Sheet><Strategy s={profile.strategy} documents={documents} /></Sheet>}
          {on.experience && <Sheet><Experience /></Sheet>}
          {on.about && <Sheet><About /></Sheet>}
        </Stack>
      </div>
    </>
  );
}
