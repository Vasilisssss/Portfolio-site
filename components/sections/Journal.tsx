import Link from "next/link";
import type { JournalEntry } from "@/lib/types";
import { dateLong } from "@/lib/format";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import CardArt from "@/components/ui/CardArt";
import { Reveal } from "@/components/ui/Reveal";

const KIND_TONE: Record<string, string> = {
  Observation: "bg-ice/70 text-ice-deep",
  Decision: "bg-lavender/70 text-lavender-deep",
  Research: "bg-[#efe3c8] text-champagne-deep",
  Lesson: "bg-pearl-2 text-graphite-2",
  "Portfolio update": "bg-snow text-graphite",
};
export const Kind = ({ k }: { k: string }) => <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${KIND_TONE[k] ?? ""}`}>{k}</span>;

/** 06 — personal market journal, newest first. */
export default function Journal({ entries }: { entries: JournalEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const [lead, ...rest] = sorted;
  return (
    <section id="journal" aria-labelledby="journal-title" className="container-x relative flex flex-col gap-14 pb-36 pt-24">
      <SectionHead index="06" eyebrow="Market journal" id="journal-title" aside={<SampleBadge show={sorted.some((e) => e.sample)} label="Sample entries" />}>
        Thinking, <em>written down.</em>
      </SectionHead>
      {!lead ? (
        <p className="glass rounded-[24px] p-10 text-mute">No entries yet. Add them in content/journal.ts.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            <Link href={`/journal/${lead.slug}`} data-cursor="Read" className="glass group flex h-full min-h-[560px] flex-col overflow-hidden rounded-[28px]">
              <div className="relative min-h-[300px] flex-1 overflow-hidden bg-[radial-gradient(120%_100%_at_80%_0%,#d4cdee,transparent_60%),radial-gradient(100%_100%_at_0%_100%,#cfe2ee,transparent_60%)]">
                <CardArt kind="feature" viewBox="0 0 600 340" className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-expo)] group-hover:scale-105" />
              </div>
              <div className="flex flex-col gap-4 p-8">
                <div className="flex items-center gap-3"><Kind k={lead.kind} /><time dateTime={lead.date} className="text-[11px] tracking-[0.18em] text-mute">{dateLong(lead.date).toUpperCase()}</time></div>
                <h3 className="font-serif text-[clamp(32px,3.2vw,52px)] leading-[1.02] transition-colors group-hover:text-lavender-deep">{lead.title}</h3>
                <p className="max-w-[560px] text-[15px] leading-[1.7] text-graphite-2">{lead.dek}</p>
              </div>
            </Link>
          </Reveal>
          <ul className="flex flex-col">
            {rest.map((e, i) => (
              <li key={e.slug}>
                <Reveal delay={i * 0.05}>
                  <Link href={`/journal/${e.slug}`} data-cursor="Read" className="group flex flex-col gap-3 border-t border-line py-7">
                    <div className="flex items-center justify-between gap-3"><Kind k={e.kind} /><time dateTime={e.date} className="text-[11px] tracking-[0.18em] text-mute">{dateLong(e.date).toUpperCase()}</time></div>
                    <span className="font-serif text-[28px] leading-[1.1] transition-[transform,color] duration-700 ease-[var(--ease-expo)] group-hover:translate-x-3 group-hover:text-lavender-deep">{e.title}</span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
