import { RevealText } from "./Reveal";

export default function SectionHead({ index, eyebrow, children, aside, id }: {
  index: string; eyebrow: string; children: React.ReactNode; aside?: React.ReactNode; id?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-8">
      <div className="flex flex-col gap-6">
        <span className="eyebrow flex items-center gap-4 text-champagne-deep"><span className="tnum">{index}</span><span className="block h-px w-10 bg-champagne" />{eyebrow}</span>
        <RevealText as="h2" className="display max-w-[980px] text-[clamp(46px,6.2vw,108px)] leading-[0.95]"><span id={id}>{children}</span></RevealText>
      </div>
      {aside}
    </div>
  );
}
