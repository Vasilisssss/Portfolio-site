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
    <div data-chapter={index} className="chapter-arrival relative flex min-h-[100svh] items-end">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[linear-gradient(to_top,rgba(5,7,8,0.9),rgba(5,7,8,0.48)_45%,transparent)] md:bg-[radial-gradient(90%_75%_at_0%_100%,rgba(5,5,6,0.85),rgba(5,5,6,0.3)_55%,transparent_80%)]" />
      <div className="container-x relative w-full pb-[14vh]">
        <div className="flex flex-col gap-8">
          <span className="eyebrow flex items-center gap-4 text-[#d9c09b]">
            <span className="whitespace-nowrap">Chapter {roman}</span><span className="block h-px w-10 shrink-0 bg-[#d9c09b]/60 md:w-16" /><span className="text-[#d9c09b]/70">{kicker}</span>
          </span>
          <RevealText as="h2" className="display max-w-[11ch] text-[clamp(44px,6.4vw,120px)] leading-[0.88] [text-shadow:0_4px_50px_rgba(0,0,0,0.6)]">{title}</RevealText>
          {stats && stats.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-7 sm:flex sm:flex-wrap sm:gap-x-16 sm:gap-y-8">
              {stats.map((s) => (
                <div key={s.label} className="flex min-w-0 flex-col gap-2 first:col-span-2 sm:first:col-span-1">
                  <dt className="label">{s.label}</dt>
                  <dd className={`tnum display text-[clamp(27px,7vw,42px)] sm:text-[clamp(32px,3.6vw,60px)] leading-none ${s.tone === "gain" ? "text-[#d9c09b]" : s.tone === "loss" ? "text-[#d99a91]" : ""}`}>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {note && <p className="max-w-[520px] font-mono text-[12px] leading-[1.8] tracking-[0.04em] text-white/55">{note}</p>}
        </div>
      </div>
    </div>
  );
}
