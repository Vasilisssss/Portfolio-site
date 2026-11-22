import { RevealText } from "@/components/ui/Reveal";

/**
 * A full-height chapter card. While it scrolls into view the camera travels to its scene,
 * so it is deliberately sparse: an index, a monumental title and one or two real figures.
 */
export default function Chapter({ index, roman, title, kicker, stats, note }: {
  index: number; roman: string; title: React.ReactNode; kicker: string;
  stats?: { value: string; label: string; tone?: "gain" | "loss" | "flat" }[]; note?: string;
}) {
  return (
    <div data-chapter={index} className="relative flex min-h-[110svh] items-end">
      <div className="container-x w-full pb-[14vh]">
        <div className="flex flex-col gap-8">
          <span className="eyebrow flex items-center gap-4 text-lime">
            <span className="whitespace-nowrap">Chapter {roman}</span><span className="block h-px w-10 shrink-0 bg-lime/60 md:w-16" /><span className="text-graphite-2">{kicker}</span>
          </span>
          <RevealText as="h2" className="display max-w-[1200px] text-[clamp(56px,10vw,184px)] leading-[0.86] [text-shadow:0_4px_60px_rgba(0,0,0,0.6)]">{title}</RevealText>
          {stats && stats.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-16 gap-y-8">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col gap-2">
                  <dt className="label">{s.label}</dt>
                  <dd className={`tnum display text-[clamp(36px,4.4vw,72px)] leading-none ${s.tone === "gain" ? "text-lime" : s.tone === "loss" ? "text-loss" : ""}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {note && <p className="max-w-[520px] font-mono text-[12px] leading-[1.8] tracking-[0.04em] text-mute">{note}</p>}
        </div>
      </div>
    </div>
  );
}
