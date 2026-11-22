import Link from "next/link";
import type { PublicView } from "@/lib/public";
import { dateLong, pct } from "@/lib/format";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import Ticker from "@/components/ui/Ticker";
import { Reveal } from "@/components/ui/Reveal";

/** 01 — the whole portfolio at a glance. Only figures the privacy settings allow are present in `view`. */
export default function Overview({ view }: { view: PublicView }) {
  const { summary: s, baseCurrency: cur, performance: perf } = view;
  const amounts = view.showAmounts && s.value != null;
  const ret = s.returnPct;

  // small trend line from the performance index (percent-based, so it is safe even with amounts hidden)
  const pts = perf?.points ?? [];
  const spark = (() => {
    if (pts.length < 2) return null;
    const ys = pts.map((p) => p.value ?? p.index);
    const mn = Math.min(...ys), mx = Math.max(...ys);
    const line = ys.map((y, i) => `${i ? "L" : "M"}${((i / (ys.length - 1)) * 600).toFixed(1)} ${(150 - ((y - mn) / (mx - mn || 1)) * 130).toFixed(1)}`).join("");
    return { line, area: `${line}L600 160L0 160Z` };
  })();

  const stats: { label: string; node: React.ReactNode; hint?: string }[] = [];
  if (amounts) {
    stats.push({ label: "Invested capital", node: <Ticker value={s.invested!} kind="money" currency={cur} />, hint: "Total cost of current positions" });
    stats.push({ label: "Current value", node: <Ticker value={s.value!} kind="money" currency={cur} />, hint: "At latest prices" });
    stats.push({ label: "Unrealised profit / loss", node: <Ticker value={s.pnl!} kind="moneySigned" currency={cur} className={s.pnl! >= 0 ? "text-gain" : "text-loss"} /> });
  }
  if (ret != null) stats.push({ label: "Overall return", node: <Ticker value={ret} kind="pctSigned" className={ret >= 0 ? "text-gain" : "text-loss"} />, hint: "On invested capital" });
  if (perf) stats.push({ label: "Time-weighted return", node: <Ticker value={perf.twr} kind="pctSigned" />, hint: "Excludes the effect of deposits" });
  if (s.positions) stats.push({ label: "Positions", node: <span className="tnum">{s.positions}</span>, hint: `Across ${s.classes} asset classes` });

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
                <span className="text-[13px] text-mute">As of {dateLong(view.asOf)}{!amounts && " · amounts kept private"}</span>
              </div>
              {perf && (
                <Link href="/#performance" className="group flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-graphite-2 hover:text-lavender-deep">
                  Full performance history
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </Link>
              )}
            </div>
            <div className="relative min-h-[240px] border-t border-white/80 lg:border-l lg:border-t-0">
              {spark ? (
                <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`Portfolio ${amounts ? "value" : "return index"} over time${perf ? `, time-weighted return ${pct(perf.twr, true)}` : ""}`}>
                  <defs>
                    <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b3a8e2" stopOpacity="0.45" /><stop offset="1" stopColor="#cfe2ee" stopOpacity="0" /></linearGradient>
                    <linearGradient id="ovLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3f6f8f" /><stop offset="1" stopColor="#5f5596" /></linearGradient>
                  </defs>
                  <path d={spark.area} fill="url(#ovFill)" />
                  <path d={spark.line} fill="none" stroke="url(#ovLine)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <p className="flex h-full items-center justify-center p-10 text-center text-sm text-mute">Add month-end history to show the portfolio over time.</p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t border-white/80 md:grid-cols-3 xl:grid-cols-6">
            {stats.map((st) => (
              <div key={st.label} className="flex flex-col gap-2 border-b border-r border-white/70 p-6 md:p-7">
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
