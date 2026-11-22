import { RevealText } from "./Reveal";
import Parallax from "./Parallax";

/** Section header: eyebrow, masked headline reveal, and an oversized outlined index numeral drifting behind. */
export default function SectionHead({ index, eyebrow, children, aside, id }: {
  index: string; eyebrow: string; children: React.ReactNode; aside?: React.ReactNode; id?: string;
}) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-8">
      <Parallax speed={0.5} className="pointer-events-none absolute -top-24 right-0 -z-10 select-none md:-top-36">
        <span className="display block text-[clamp(160px,24vw,380px)] leading-none text-transparent [-webkit-text-stroke:1px_rgba(46,106,153,0.18)]">{index}</span>
      </Parallax>
      <div className="flex flex-col gap-6">
        <span className="eyebrow flex items-center gap-4 text-ice-deep"><span className="tnum">{index}</span><span className="block h-px w-10 iris-line" />{eyebrow}</span>
        <RevealText as="h2" className="display max-w-[980px] text-[clamp(46px,6.2vw,108px)] leading-[0.95]"><span id={id}>{children}</span></RevealText>
      </div>
      {aside}
    </div>
  );
}
