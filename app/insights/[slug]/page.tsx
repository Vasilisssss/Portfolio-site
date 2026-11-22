import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { insights, getInsight, insightsAreSamples } from "@/content/insights";
import { dateLong } from "@/lib/format";
import { RevealText } from "@/components/ui/Reveal";
import SampleBadge from "@/components/ui/SampleBadge";

export const dynamicParams = false;
export function generateStaticParams() {
  return insights.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getInsight((await params).slug);
  if (!a) return {};
  return { title: a.title, description: a.dek, openGraph: { type: "article", title: a.title, description: a.dek, publishedTime: a.date } };
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getInsight(slug);
  if (!a) notFound();
  const more = insights.filter((x) => x.slug !== a.slug).slice(0, 3);
  return (
    <article className="container-x flex flex-col gap-24 pb-32 pt-40">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="eyebrow text-gold">{a.tag} · <time dateTime={a.date}>{dateLong(a.date)}</time> · {a.readMinutes} min</span>
          {insightsAreSamples && <SampleBadge label="Sample article" force />}
        </div>
        <RevealText as="h1" onLoad className="display text-[clamp(48px,6vw,96px)] leading-[0.98]">{a.title}</RevealText>
        <p className="font-serif text-[30px] italic leading-[1.35] text-ivory-dim">{a.dek}</p>
        <hr className="border-line" />
        {a.body.map((p, i) => <p key={i} className="text-lg leading-[1.8] text-ivory-dim">{p}</p>)}
      </div>
      <aside aria-labelledby="more" className="flex flex-col gap-6 border-t border-line pt-12">
        <h2 id="more" className="eyebrow text-gold">Further reading</h2>
        <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {more.map((m) => (
            <li key={m.slug}>
              <Link href={`/insights/${m.slug}`} data-cursor="Read" className="group flex flex-col gap-3">
                <span className="label">{m.tag}</span>
                <span className="font-serif text-[28px] leading-[1.1] transition-colors group-hover:text-gold">{m.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  );
}
