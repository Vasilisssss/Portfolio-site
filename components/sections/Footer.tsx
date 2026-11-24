import { profile } from "@/content/profile";
import { navItems } from "@/lib/nav";
import Headline from "@/components/motion/Headline";
import Drift from "@/components/motion/Drift";
import Rise from "@/components/motion/Rise";
import Magnetic from "@/components/ui/Magnetic";
import RollText from "@/components/motion/RollText";
import FooterLink from "./FooterLink";
import RevealFit from "./RevealFit";

/**
 * FOOTER — the close.
 * Choreography: on large screens it is a reveal footer (it waits underneath and the last section slides up off it).
 * The closing line is set huge and drifts slowly sideways with scroll; its two lines reveal from their masks. The
 * columns rise in sequence; the email is magnetic with a text-roll; the outlined name drifts the other way.
 */
export default function Footer() {
  return (
    <footer id="contact" className="reveal-footer relative overflow-hidden border-t border-white/[0.06] bg-gradient-to-b from-pearl to-[#0d0f11]">
      <RevealFit />
      <div aria-hidden className="pointer-events-none absolute -bottom-60 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,192,155,0.12),transparent)] opacity-80 blur-2xl" />
      <div className="container-x relative flex flex-col gap-20 pb-10 pt-32">
        <Drift from={4} to={-6}>
          <h2 className="display text-[clamp(48px,10vw,184px)] leading-[0.9] tracking-[-0.035em] md:whitespace-nowrap">
            <Headline as="span" drift={false} className="block">{profile.closing[0]}</Headline>
            <Headline as="span" drift={false} delay={0.12} className="block pb-[0.06em] text-ice-deep"><em>{profile.closing[1]}</em></Headline>
          </h2>
        </Drift>
        <Rise stagger={0.08} className="grid grid-cols-1 gap-12 border-t border-line-2/60 pt-12 sm:grid-cols-3">
          <div className="flex flex-col gap-3.5">
            <h3 className="label">Say hello</h3>
            <Magnetic strength={0.2}>
              <a href={`mailto:${profile.email}`} data-cursor="Write" className="roll-host font-serif text-[28px] transition-colors hover:text-ice-deep"><RollText>{profile.email}</RollText></a>
            </Magnetic>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <h3 className="label">Explore</h3>
            {navItems().map((n) => <FooterLink key={n.href} href={n.href} label={n.label} />)}
          </nav>
          <div className="flex flex-col gap-3 text-sm">
            <h3 className="label">Elsewhere</h3>
            {profile.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="roll-host w-fit text-graphite-2 transition-colors hover:text-ice-deep"><RollText>{`${s.label} ↗`}</RollText></a>)}
          </div>
        </Rise>
        <Drift from={-3} to={5}>
          <p aria-hidden className="-mx-[1vw] select-none whitespace-nowrap font-serif text-[17vw] font-light leading-[0.8] tracking-[-0.045em] text-transparent [-webkit-text-stroke:1px_rgba(217,192,155,0.14)]">{profile.name}</p>
        </Drift>
        <div className="flex flex-wrap justify-between gap-x-10 gap-y-4 text-[11px] leading-[1.7] text-mute">
          <span className="flex items-center gap-4">
            © {new Date().getFullYear()} {profile.name}
            {process.env.NEXT_PUBLIC_PRIVATE_VIEW === "1" && (
              <a href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/private/`} rel="nofollow" className="inline-flex items-center gap-1.5 text-mute/80 transition-colors hover:text-ice-deep">
                <svg aria-hidden width="10" height="11" viewBox="0 0 10 11" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="5" width="8" height="5.4" rx="1" /><path d="M3 5V3.4a2 2 0 0 1 4 0V5" /></svg>
                Private view
              </a>
            )}
          </span>
          <p className="max-w-[720px]">{profile.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
