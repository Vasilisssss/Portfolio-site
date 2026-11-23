import Link from "next/link";\nconst basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
import type { PublicView } from "@/lib/public";
import { dateLong, moneySigned, pct } from "@/lib/format";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import Ticker from "@/components/ui/Ticker";
import { Reveal } from "@/components/ui/Reveal";
import Sparkline from "@/components/ui/Sparkline";

/** 01 — the whole portfolio at a glance. Only figures the privacy settings allow are present in `view`. */
export default function Overview({ view }: { view: PublicView }) {
  const { summary: s, baseCurrency: cur, performance: perf } = view;
  const amounts = view.showAmounts && s.value != null;
  const ret = s.returnPct;

  // trend line from the performance history (percent-based index when amounts are hidden)
  const pts = perf?.points ?? [];
  const sparkValues = pts.length >= 2 ? pts.map((p) => p.value ?? p.index) : null;

  const stats: { label: string; node: React.ReactNode; hint?: string }[] = [];
  if (amounts) {
    stats.push({ label: "Invested capital", node: <Ticker value={s.invested!} kind="money" currency={cur} />, hint: s.investedSource === "deposits" ? "Money deposited, net of withdrawals" : "Cost of current positions" });
    stats.push({ label: "Profit / loss", node: <Ticker value={s.pnl!} kind="moneySigned" currency={cur} className={s.pnl! >= 0 ? "text-gain" : "text-loss"} />, hint: "Portfolio value − invested capital" });
  }
  if (ret != null) stats.push({ label: "Total return", node: <Ticker value={ret} kind="pctSigned" className={ret >= 0 ? "text-gain" : "text-loss"} />, hint: "Profit / loss ÷ invested capital" });
  if (perf) stats.push({ label: "Time-weighted return", node: <Ticker value={perf.twr} kind="pctSigned" className={perf.twr >= 0 ? "text-gain" : "text-loss"} />, hint: "Ignores the timing of deposits" });
  if (s.positions) stats.push({ label: "Positions", node: <span className="tnum">{s.positions}</span>, hint: `Across ${s.classes} asset classes` });
  const recon = amounts && s.positionsPnl != null && s.otherPnl != null && Math.abs(s.otherPnl) >= 0.005;

  return (
    <section id="overview" aria-labelledby="overview-title" className="container-x relative pb-24 pt-28">
      <SectionHead index="01" eyebrow="Overview" id="overview-title" aside={<SampleBadge show={view.sample} />}>
        Where my capital <em>stands today.</em>
      </SectionHead>

      <Reveal className="mt-16">
        <div className="glass overflow-hidden rounded-[28px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col justify-between gap-10 p-8 md:p-12">
              <div className="flex flex-col gap-4">
                <span className="label">{amounts ? "Total portfolio value" : "Overall return"}</span>
                <span className="display text-[clamp(56px,7.6vw,128px)] leading-[0.9]">
                  {amounts ? <Ticker value={s.value!} kind="money" currency={cur} /> : ret != null ? <Ticker value={ret} kind="pctSigned" /> : "—"}
                </span>
                <span className="text-[13px] text-mute">As of {dateLong(view.asOf)}{view.source && ` · ${view.source}`}{!amounts && " · amounts kept private"}</span>
                {recon && (
                  <span className="tnum text-[13px] text-graphite-2">
                    Profit / loss {moneySigned(s.pnl!, cur)} = open positions {moneySigned(s.positionsPnl!, cur)} + fees, FX &amp; cash {moneySigned(s.otherPnl!, cur)}
                  </span>
                )}
              </div>
              {perf && (
                <Link href={`${basePath}/#performance`} className="group flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-graphite-2 hover:text-lavender-deep">
                  Full performance history
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              )}
            </div>
            <div className="relative min-h-[240px] border-t border-white/[0.06] lg:border-l lg:border-t-0">
              {sparkValues ? (
                <Sparkline values={sparkValues} className="absolute inset-0" label={`Portfolio ${amounts ? "value" : "return index"} over time${perf ? `, time-weighted return ${pct(perf.twr, true)}` : ""}`} />
              ) : (
                <p className="flex h-full items-center justify-center p-10 text-center text-sm text-mute">Add month-end history to show the portfolio over time.</p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-t border-white/[0.06]">
            {stats.map((st) => (
              <div key={st.label} className="flex flex-col gap-2 border-b border-r border-white/[0.06] p-6 md:p-7">
                <dt className="label">{st.label}</dt>
                <dd className="font-serif text-[clamp(26px,2.4vw,36px)] leading-none">{st.node}</dd>
                {st.hint && <dd className="text-[12px] text-mute">{st.hint}</dd>}
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
