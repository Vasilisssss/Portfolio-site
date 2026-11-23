import Link from "next/link";
import { profile } from "@/content/profile";
import { navItems } from "@/lib/nav";
import { RevealText } from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";

export default function Footer() {
  return (
    <footer id="contact" className="relative z-[1] overflow-hidden border-t border-white/[0.06] bg-gradient-to-b from-pearl to-[#0d0f11]">
      <div aria-hidden className="pointer-events-none absolute -bottom-60 left-1/2 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(217,192,155,0.12),transparent)] opacity-80 blur-2xl" />
      <div className="container-x relative flex flex-col gap-24 pb-10 pt-40">
        <h2 className="display text-[clamp(56px,10vw,184px)] leading-[0.88] tracking-[-0.035em]">
          <RevealText as="span" className="block">{profile.closing[0]}</RevealText>
          <RevealText as="span" delay={0.12} className="block serif pb-[0.06em] text-lime">{profile.closing[1]}</RevealText>
        </h2>
        <div className="grid grid-cols-1 gap-12 border-t border-line-2/60 pt-12 sm:grid-cols-3">
          <div className="flex flex-col gap-3.5">
            <h3 className="label">Say hello</h3>
            <Magnetic strength={0.2}>
              <a href={`mailto:${profile.email}`} className="font-serif text-[28px] transition-colors hover:text-lavender-deep">{profile.email}</a>
            </Magnetic>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <h3 className="label">Explore</h3>
            {navItems().map((n) => <Link key={n.href} href={n.href} className="w-fit text-graphite-2 transition-colors hover:text-lavender-deep">{n.label}</Link>)}
          </nav>
          <div className="flex flex-col gap-3 text-sm">
            <h3 className="label">Elsewhere</h3>
            {profile.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="w-fit text-graphite-2 transition-colors hover:text-lavender-deep">{s.label} ↗</a>)}
          </div>
        </div>
        <p aria-hidden className="-mx-[1vw] select-none whitespace-nowrap font-serif text-[17vw] font-light leading-[0.8] tracking-[-0.045em] text-transparent [-webkit-text-stroke:1px_rgba(243,242,237,0.1)]">{profile.name}</p>
        <div className="flex flex-wrap justify-between gap-x-10 gap-y-4 text-[11px] leading-[1.7] text-mute">
          <span>© {new Date().getFullYear()} {profile.name}</span>
          <p className="max-w-[720px]">{profile.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
