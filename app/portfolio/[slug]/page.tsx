import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { portfolio, getInvestment, valueOf, initialOf } from "@/content/portfolio";
import { money, pct, pad2 } from "@/lib/format";
import { sparkPath } from "@/lib/series";
import CardArt from "@/components/ui/CardArt";
import SampleBadge from "@/components/ui/SampleBadge";
import { RevealText, Reveal } from "@/components/ui/Reveal";

export const dynamicParams = false;
export function generateStaticParams() {
  return portfolio.investments.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const inv = getInvestment((await params).slug);
  if (!inv) return {};
  return { title: inv.name, description: inv.thesis };
}

export default async function InvestmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const inv = getInvestment(slug);
  if (!inv) notFound();
  const list = portfolio.investments;
  const i = list.indexOf(inv);
  const prev = list[(i + list.length - 1) % list.length], next = list[(i + 1) % list.length];
  const stats = [
    { label: "Current value", v: money(valueOf(inv)) },
    { label: "Initial investment", v: money(initialOf(inv)) },
    { label: "Return", v: pct(inv.returnSinceEntry, true) },
    { label: "Allocation", v: `${inv.allocation.toFixed(1)}%` },
    { label: "Horizon", v: inv.horizon },
    { label: "Since", v: inv.entryYear },
  ];

  return (
    <article className="container-x flex flex-col gap-16 pb-32 pt-36">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex gap-3 text-[10px] tracking-[0.28em] text-silver">
          <li><Link href="/#portfolio" className="hover:text-gold">PORTFOLIO</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">{inv.category.toUpperCase()}</li>
        </ol>
        <SampleBadge />
      </nav>

      <header className="flex flex-col gap-6">
        <span className="eyebrow text-gold">{pad2(i + 1)} — {inv.category}</span>
        <RevealText as="h1" onLoad className="display text-[clamp(52px,8vw,140px)] leading-[0.92]">{inv.name}</RevealText>
      </header>

      <Reveal>
        <div className="relative h-[clamp(320px,44vw,560px)] overflow-hidden border border-line bg-[#0E1012]">
          <CardArt kind={inv.art} seed={i + 1} strong className="absolute inset-0 h-full w-full" />
        </div>
      </Reveal>

      <dl className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-2.5 bg-ink p-6">
            <dt className="label text-mute">{s.label}</dt>
            <dd className="tnum font-serif text-[clamp(26px,2.4vw,34px)]">{s.v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="thesis" className="flex flex-wrap gap-16">
        <div className="flex flex-[1_1_260px] flex-col gap-4">
          <h2 id="thesis" className="eyebrow text-gold">Investment thesis</h2>
          {portfolio.illustrative && <p className="text-[13px] leading-[1.7] text-mute">Sample thesis — replace with your own in content/portfolio.ts.</p>}
        </div>
        <RevealText as="p" className="display flex-[2.4_1_560px] text-[clamp(30px,3vw,46px)] leading-[1.2]">{inv.thesis}</RevealText>
      </section>

      <Reveal>
        <figure className="flex flex-col gap-4 border border-line p-7">
          <figcaption className="label">Value since entry · {portfolio.illustrative ? "sample" : "verified"}</figcaption>
          <svg viewBox="0 0 140 36" preserveAspectRatio="none" className="h-[220px] w-full" role="img" aria-label={`${inv.name} value trend, ${pct(inv.returnSinceEntry, true)} since entry`}>
            <path d={sparkPath(inv, i)} fill="none" stroke="#B9A477" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </svg>
        </figure>
      </Reveal>

      <nav aria-label="More investments" className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
        <Link href={`/portfolio/${prev.slug}`} data-cursor="Prev" className="group flex flex-col gap-3 bg-ink p-8">
          <span className="label">← Previous</span>
          <span className="font-serif text-[32px] transition-colors group-hover:text-gold">{prev.name}</span>
        </Link>
        <Link href={`/portfolio/${next.slug}`} data-cursor="Next" className="group flex flex-col items-end gap-3 bg-ink p-8 text-right">
          <span className="label">Next →</span>
          <span className="font-serif text-[32px] transition-colors group-hover:text-gold">{next.name}</span>
        </Link>
      </nav>
    </article>
  );
}
