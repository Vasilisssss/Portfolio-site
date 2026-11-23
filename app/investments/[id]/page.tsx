import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicView, getPublicHolding } from "@/lib/public";
import { dateLong, money, moneySigned, num, pct } from "@/lib/format";
import { classColor } from "@/lib/palette";
import CardArt from "@/components/ui/CardArt";
import SampleBadge from "@/components/ui/SampleBadge";
import { RevealText, Reveal } from "@/components/ui/Reveal";

export const dynamicParams = false;

export function generateStaticParams() {
  // only holdings that pass the privacy filter get a page at all
  const ids = getPublicView().holdings.map((h) => ({ id: h.id }));
  return ids.length ? ids : [{ id: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const h = getPublicHolding((await params).id);
  return h ? { title: h.name, description: `${h.name}${h.ticker ? ` (${h.ticker})` : ""} — ${h.assetClass} in my personal portfolio.` } : {};
}

export default async function InvestmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = getPublicView();
  const h = getPublicHolding(id);
  if (!h) notFound();
  const list = view.holdings;
  const i = list.findIndex((x) => x.id === h.id);
  const prev = list[(i + list.length - 1) % list.length], next = list[(i + 1) % list.length];
  const cur = view.baseCurrency;
  const color = classColor(h.assetClass);
  const classInfo = view.classes.find((c) => c.key === h.assetClass);

  // only fields that actually exist are shown
  const fields: { label: string; value: string; tone?: number }[] = [];
  if (h.ticker) fields.push({ label: "Ticker", value: h.ticker });
  if (h.quantity != null) fields.push({ label: "Quantity", value: `${num(h.quantity)}${h.unit ? ` ${h.unit}` : ""}` });
  if (h.avgPrice != null) fields.push({ label: "Average purchase price", value: money(h.avgPrice, h.currency, 2) });
  if (h.currentPrice != null) fields.push({ label: "Current price", value: money(h.currentPrice, h.currency, 2) });
  if (h.invested != null) fields.push({ label: "Cost basis (incl. fees)", value: money(h.invested, cur, 2) });
  if (h.value != null) fields.push({ label: "Current valuation", value: money(h.value, cur, 2) });
  if (h.pnl != null) fields.push({ label: "Profit / loss", value: moneySigned(h.pnl, cur), tone: h.pnl });
  if (h.returnPct != null) fields.push({ label: "Return", value: pct(h.returnPct, true), tone: h.returnPct });
  fields.push({ label: "Portfolio allocation", value: pct(h.weight) });
  if (h.purchaseDate) fields.push({ label: "Purchase date", value: dateLong(h.purchaseDate) });
  if (h.geography) fields.push({ label: "Geography", value: h.geography });
  if (h.industry) fields.push({ label: "Industry", value: h.industry });
  if (h.currency !== cur) fields.push({ label: "Trading currency", value: h.currency });


  return (
    <article className="container-x flex flex-col gap-14 pb-32 pt-36">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex gap-3 text-[10px] uppercase tracking-[0.26em] text-mute">
          <li><Link href="/#investments" className="hover:text-lavender-deep">My investments</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">{h.assetClass}</li>
        </ol>
        <SampleBadge show={view.sample} />
      </nav>

      <header className="flex flex-col gap-6">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-graphite-2"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{h.assetClass}{h.ticker && ` · ${h.ticker}`}</span>
        <RevealText as="h1" onLoad className="display text-[clamp(52px,8vw,140px)] leading-[0.92]">{h.name}</RevealText>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="glass relative h-[clamp(300px,40vw,520px)] overflow-hidden rounded-[28px]" style={{ background: `radial-gradient(120% 100% at 75% 0%, ${color}66, transparent 65%), linear-gradient(160deg, rgba(22,24,27,.85), rgba(10,11,13,.75))` }}>
            <CardArt assetClass={h.assetClass} seed={i + 1} accent={color} className="absolute inset-0 h-full w-full" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="glass flex h-full flex-col justify-between gap-8 rounded-[28px] p-8">
            <div className="flex flex-col gap-3">
              <span className="label">Share of my portfolio</span>
              <span className="tnum display text-[clamp(64px,7vw,112px)] leading-none">{pct(h.weight)}</span>
            </div>
            <div className="flex flex-col gap-3">
              <span className="block h-3 overflow-hidden rounded-full bg-pearl-2"><span className="block h-full rounded-full" style={{ width: `${Math.max(h.weight * 100, 1)}%`, background: color }} /></span>
              {classInfo && <span className="text-[13px] text-mute">{h.assetClass} as a whole: {pct(classInfo.weight)} of the portfolio</span>}
            </div>
            {h.returnPct != null && (
              <div className="flex flex-col gap-1">
                <span className="label">Return since purchase</span>
                <span className={`tnum font-serif text-[44px] leading-none ${h.returnPct >= 0 ? "text-gain" : "text-loss"}`}>{pct(h.returnPct, true)}</span>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] bg-white/[0.06] md:grid-cols-3 xl:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-2.5 bg-pearl/90 p-6 backdrop-blur">
            <dt className="label">{f.label}</dt>
            <dd className={`tnum font-serif text-[clamp(24px,2.2vw,32px)] leading-tight ${f.tone == null ? "" : f.tone >= 0 ? "text-gain" : "text-loss"}`}>{f.value}</dd>
          </div>
        ))}
      </dl>

      {h.note && (
        <section aria-labelledby="note" className="flex flex-wrap gap-12">
          <h2 id="note" className="eyebrow flex-[1_1_220px] text-ice-deep">Why I hold it</h2>
          <RevealText as="p" className="display flex-[2.4_1_560px] text-[clamp(28px,3vw,44px)] leading-[1.2]">{h.note}</RevealText>
        </section>
      )}


      {list.length > 1 && (
        <nav aria-label="More investments" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href={`/investments/${prev.id}`} data-cursor="Prev" className="glass group flex flex-col gap-3 rounded-[24px] p-8"><span className="label">← Previous</span><span className="font-serif text-[30px] group-hover:text-lavender-deep">{prev.name}</span></Link>
          <Link href={`/investments/${next.id}`} data-cursor="Next" className="glass group flex flex-col items-end gap-3 rounded-[24px] p-8 text-right"><span className="label">Next →</span><span className="font-serif text-[30px] group-hover:text-lavender-deep">{next.name}</span></Link>
        </nav>
      )}
    </article>
  );
}
