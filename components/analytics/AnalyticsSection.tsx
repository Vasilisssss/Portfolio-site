import Link from "next/link";
import { portfolio, valueOf } from "@/content/portfolio";
import { buildSeries, stats, sparkPath } from "@/lib/series";
import { money, moneyCompact, pct } from "@/lib/format";
import { RevealText, Reveal } from "@/components/ui/Reveal";
import SampleBadge from "@/components/ui/SampleBadge";
import PerformanceChart from "./PerformanceChart";
import { AllocationDonut, Exposure } from "./Allocation";

export default function AnalyticsSection() {
  const series = buildSeries();
  const s = stats(series);
  const kpis = [
    { label: "Since inception", v: pct(s.inception, true) },
    { label: "Annualised", v: pct(s.cagr, true) },
    { label: "Volatility", v: pct(s.volatility) },
    { label: "Max drawdown", v: pct(s.maxDrawdown) },
  ];
  // serialise only what the chart needs
  const lean = series.map((p) => ({ t: p.t, v: Math.round(p.v), b: +p.b.toFixed(5) }));

  return (
    <section id="analytics" aria-labelledby="analytics-title" className="container-x relative z-[2] flex flex-col gap-14 pb-36 pt-20">
      <div className="flex flex-wrap items-end justify-between gap-8 border-t border-line pt-14">
        <div className="flex flex-col gap-5">
          <span className="eyebrow text-gold">II — Portfolio analytics</span>
          <span className="label">Total portfolio value</span>
          <RevealText as="p" className="tnum display text-[clamp(56px,7.4vw,128px)] leading-[0.9]"><span id="analytics-title">{money(portfolio.totalValue)}</span></RevealText>
          <SampleBadge />
        </div>
        <dl className="grid grid-cols-2 gap-x-10 gap-y-7">
          {kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-1.5">
              <dt className="label">{k.label}</dt>
              <dd className="tnum font-serif text-[34px]">{k.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Reveal><PerformanceChart series={lean} /></Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal><AllocationDonut /></Reveal>
        <Reveal delay={0.1}><Exposure /></Reveal>
      </div>

      <Reveal>
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <caption className="sr-only">Individual asset performance (sample data)</caption>
            <thead>
              <tr className="border-b border-line text-[10px] tracking-[0.22em] text-mute">
                {["Investment", "Category", "Value", "Weight", "Return", "Trend"].map((h) => <th key={h} scope="col" className="px-7 py-[18px] font-normal uppercase">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {portfolio.investments.map((inv, i) => (
                <tr key={inv.slug} className="group border-b border-[#16181A] transition-colors hover:bg-panel">
                  <th scope="row" className="px-7 py-4 font-normal">
                    <Link href={`/portfolio/${inv.slug}`} data-cursor="View" className="font-serif text-[22px] transition-colors group-hover:text-gold">{inv.name}</Link>
                  </th>
                  <td className="px-7 text-[13px] text-silver">{inv.category}</td>
                  <td className="tnum px-7 text-sm">{moneyCompact(valueOf(inv))}</td>
                  <td className="tnum px-7 text-sm">{inv.allocation.toFixed(1)}%</td>
                  <td className={`tnum px-7 text-sm ${inv.returnSinceEntry >= 0 ? "text-ivory" : "text-[#C98B7A]"}`}>{pct(inv.returnSinceEntry, true)}</td>
                  <td className="px-7"><svg viewBox="0 0 140 36" className="h-9 w-[140px]" aria-hidden><path d={sparkPath(inv, i)} fill="none" stroke="#B9A477" strokeWidth={1} /></svg></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}
