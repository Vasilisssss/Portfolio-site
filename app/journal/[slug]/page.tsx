import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { journal, getEntry } from "@/content/journal";
import { getPublicHolding } from "@/lib/public";
import { dateLong } from "@/lib/format";
import { RevealText } from "@/components/ui/Reveal";
import SampleBadge from "@/components/ui/SampleBadge";
import { Kind } from "@/components/sections/Journal";

export const dynamicParams = false;
export function generateStaticParams() {
  return journal.length ? journal.map((e) => ({ slug: e.slug })) : [{ slug: "none" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = getEntry((await params).slug);
  return e ? { title: e.title, description: e.dek, openGraph: { type: "article", title: e.title, description: e.dek, publishedTime: e.date } } : {};
}

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = getEntry(slug);
  if (!e) notFound();
  // mention holdings only if they are public
  const linked = (e.holdings ?? []).map((id) => getPublicHolding(id)).filter((h) => h != null);
  const more = journal.filter((x) => x.slug !== e.slug).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <article className="container-x flex flex-col gap-24 pb-32 pt-40">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Kind k={e.kind} /><time dateTime={e.date} className="text-[11px] tracking-[0.18em] text-mute">{dateLong(e.date).toUpperCase()}</time></div>
          <SampleBadge show={!!e.sample} label="Sample entry" />
        </div>
        <RevealText as="h1" onLoad className="display text-[clamp(46px,6vw,96px)] leading-[0.98]">{e.title}</RevealText>
        <p className="font-serif text-[28px] italic leading-[1.35] text-graphite-2">{e.dek}</p>
        {linked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {linked.map((h) => <Link key={h.id} href={`/investments/${h.id}`} className="glass rounded-full px-4 py-2 text-[12px] hover:text-lavender-deep">{h.ticker ?? h.name}</Link>)}
          </div>
        )}
        <hr className="border-line" />
        {e.body.map((p, i) => <p key={i} className="text-lg leading-[1.8] text-graphite-2">{p}</p>)}
      </div>
      {more.length > 0 && (
        <aside aria-labelledby="more" className="flex flex-col gap-6 border-t border-line pt-12">
          <h2 id="more" className="eyebrow text-ice-deep">More from the journal</h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {more.map((m) => (
              <li key={m.slug}><Link href={`/journal/${m.slug}`} data-cursor="Read" className="glass group flex h-full flex-col gap-3 rounded-[24px] p-6"><Kind k={m.kind} /><span className="font-serif text-[26px] leading-[1.1] group-hover:text-lavender-deep">{m.title}</span></Link></li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
