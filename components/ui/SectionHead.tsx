import { RevealText } from "./Reveal";

export default function SectionHead({ index, eyebrow, children, aside, tone = "dark" }: {
  index: string; eyebrow: string; children: React.ReactNode; aside?: React.ReactNode; tone?: "dark" | "light";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-8">
      <div className="flex flex-col gap-6">
        <span className={`eyebrow ${tone === "light" ? "text-gold-deep" : "text-gold"}`}>{index} — {eyebrow}</span>
        <RevealText as="h2" className="display max-w-[960px] text-[clamp(48px,6.4vw,112px)] leading-[0.95]">{children}</RevealText>
      </div>
      {aside}
    </div>
  );
}
