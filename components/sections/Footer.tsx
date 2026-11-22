import Link from "next/link";
import { site } from "@/content/site";
import { RevealText } from "@/components/ui/Reveal";
import Magnetic from "@/components/ui/Magnetic";

export default function Footer() {
  return (
    <footer id="contact" className="relative z-[2] overflow-hidden bg-charcoal">
      <div className="container-x flex flex-col gap-24 pb-10 pt-40">
        <h2 className="display text-[clamp(56px,10vw,184px)] leading-[0.88] tracking-[-0.03em]">
          <RevealText as="span" className="block">{site.closing[0]}</RevealText>
          <RevealText as="span" delay={0.12} className="block italic text-gold">{site.closing[1]}</RevealText>
        </h2>
        <div className="grid grid-cols-1 gap-12 border-t border-[#2A2D31] pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3.5">
            <h3 className="label text-mute">Contact</h3>
            <a href={`mailto:${site.email}`} className="font-serif text-[26px] transition-colors hover:text-gold">{site.email}</a>
            <address className="text-sm not-italic leading-[1.7] text-silver">{site.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <h3 className="label text-mute">Navigate</h3>
            {site.nav.filter((n) => n.label !== "Contact").map((n) => <Link key={n.href} href={n.href} className="w-fit transition-colors hover:text-gold">{n.label}</Link>)}
          </nav>
          <div className="flex flex-col gap-3 text-sm">
            <h3 className="label text-mute">Follow</h3>
            {site.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="w-fit transition-colors hover:text-gold">{s.label}</a>)}
          </div>
          <div className="flex flex-col items-start gap-3.5">
            <h3 className="label text-mute">Correspondence</h3>
            <p className="text-sm leading-[1.7] text-silver">Quarterly letters for partners and friends of the office.</p>
            <Magnetic strength={0.25}>
              <a href={`mailto:${site.email}?subject=Quarterly%20letters`} className="inline-flex h-12 items-center rounded-full border border-gold px-[22px] text-[11px] uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold hover:text-ink">Request letters</a>
            </Magnetic>
          </div>
        </div>
        <p aria-hidden className="-mx-[1vw] whitespace-nowrap font-serif text-[18vw] font-light leading-[0.8] tracking-[-0.04em] text-[#1E2124]">{site.firm}</p>
        <div className="flex flex-wrap justify-between gap-x-10 gap-y-4 text-[11px] leading-[1.7] text-mute">
          <span>© {new Date().getFullYear()} {site.firm} {site.firmSuffix}. All rights reserved.</span>
          <p className="max-w-[720px]">{site.disclaimer}</p>
        </div>
      </div>
    </footer>
  );
}
