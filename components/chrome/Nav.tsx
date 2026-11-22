"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/content/site";
import { pad2 } from "@/lib/format";
import Monogram from "./Monogram";
import MarketClock from "./MarketClock";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const openBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    if (open) { lenis?.stop(); document.body.style.overflow = "hidden"; closeBtn.current?.focus(); }
    else { lenis?.start(); document.body.style.overflow = ""; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) { setOpen(false); openBtn.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-500 ${scrolled ? "border-line bg-ink/80" : "border-transparent bg-transparent"}`}>
        <div className="container-x flex items-center justify-between gap-6 py-5">
          <Link href="/#top" aria-label={`${site.firm} ${site.firmSuffix} — home`} className="flex items-center gap-3.5">
            <Monogram draw />
            <span className="flex flex-col leading-[1.1]">
              <span className="font-serif text-[22px] font-medium tracking-[0.02em]">{site.firm}</span>
              <span className="text-[10px] tracking-[0.32em] text-silver">{site.firmSuffix.toUpperCase()}</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-9 text-[11px] tracking-[0.24em] lg:flex">
            {site.nav.map((n) => (
              <Link key={n.href} href={n.href} className="group relative py-2 uppercase">
                {n.label}
                <span className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-gold transition-transform duration-500 ease-[var(--ease-expo)] group-hover:origin-left group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <MarketClock />
            <button ref={openBtn} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="site-menu"
              className="flex h-11 items-center gap-2.5 rounded-full border border-line-2 px-[18px] text-[11px] tracking-[0.24em] transition-colors hover:border-gold">
              MENU
              <span aria-hidden className="flex flex-col gap-1"><span className="block h-px w-4 bg-ivory" /><span className="block h-px w-2.5 bg-gold" /></span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu" role="dialog" aria-modal="true" aria-label="Site menu"
            className="fixed inset-0 z-[90] flex flex-col justify-between overflow-y-auto bg-ink px-[clamp(20px,3vw,32px)] pb-10 pt-6"
            initial={{ clipPath: "circle(0% at calc(100% - 80px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 80px) 44px)", transition: { duration: 1, ease: [0.7, 0, 0.2, 1] } }}
            exit={{ clipPath: "circle(0% at calc(100% - 80px) 44px)", transition: { duration: 0.8, ease: [0.7, 0, 0.2, 1] } }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.32em] text-silver">{site.firm.toUpperCase()} {site.firmSuffix.toUpperCase()}</span>
              <button ref={closeBtn} type="button" onClick={() => { setOpen(false); openBtn.current?.focus(); }}
                className="h-11 rounded-full border border-line-2 px-[18px] text-[11px] tracking-[0.24em] hover:border-gold">CLOSE ✕</button>
            </div>
            <nav aria-label="Menu" className="flex flex-col">
              {site.nav.map((n, i) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="group flex items-baseline gap-7 overflow-hidden border-b border-[#1a1c1f] py-2">
                  <span className="tnum w-8 text-[11px] tracking-[0.2em] text-gold">{pad2(i + 1)}</span>
                  <motion.span
                    className="display block text-[clamp(44px,7vw,104px)] leading-[1.02] transition-[color,transform] duration-500 group-hover:translate-x-4 group-hover:text-gold"
                    initial={{ y: "110%" }} animate={{ y: 0, transition: { delay: 0.25 + i * 0.06, duration: 1, ease: [0.2, 0.8, 0.2, 1] } }} exit={{ y: "110%", transition: { duration: 0.4 } }}
                  >
                    {n.label}
                  </motion.span>
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap justify-between gap-x-10 gap-y-4 text-xs text-silver">
              <a href={`mailto:${site.email}`}>{site.email}</a>
              <span>{site.closing.join(" ")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
