"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pad2 } from "@/lib/format";
import { lenis, scrollToTarget } from "@/components/motion/gsap";
import RollText from "@/components/motion/RollText";
import Monogram from "./Monogram";
import MarketClock from "./MarketClock";

export interface NavItem { label: string; href: string }

/** In-page anchors scroll through Lenis (smooth, and in step with every ScrollTrigger) instead of jumping. */
export function onAnchor(e: React.MouseEvent<HTMLAnchorElement>, href: string, after?: () => void) {
  const hash = href.includes("#") ? href.slice(href.indexOf("#") + 1) : "";
  const home = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/";
  if (!hash || (location.pathname !== home && location.pathname !== home.replace(/\/$/, ""))) return;
  const el = document.getElementById(hash);
  if (!el) return;
  e.preventDefault();
  after?.();
  history.replaceState(null, "", `#${hash}`);
  // after a closing menu, wait a frame so Lenis is running again
  requestAnimationFrame(() => scrollToTarget(hash === "top" ? 0 : el));
}

export default function Nav({ name, items, email, closing }: { name: string; items: NavItem[]; email: string; closing: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const openBtn = useRef<HTMLButtonElement>(null);

  // always on screen; gains its blurred backdrop once past the hero
  useEffect(() => {
    const on = () => {
      const y = window.scrollY;
      const hero = document.querySelector<HTMLElement>("[data-walk]");
      setScrolled(hero ? y > hero.offsetTop + hero.offsetHeight - window.innerHeight * 0.9 : y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const l = lenis();
    if (open) { l?.stop(); document.body.style.overflow = "hidden"; closeBtn.current?.focus(); }
    else { l?.start(); document.body.style.overflow = ""; }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) { setOpen(false); openBtn.current?.focus(); return; }
      if (e.key !== "Tab" || !open) return;
      const dialog = document.getElementById("site-menu");
      const focusable = dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => { document.body.style.overflow = ""; lenis()?.start(); }, []);

  return (
    <>
      {/* scroll progress: a thin champagne line across the very top of the viewport */}
      <span aria-hidden ref={progress} className="pointer-events-none fixed inset-x-0 top-0 z-[60] block h-px origin-left scale-x-0 bg-ice-deep" />
      <header className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${scrolled ? "border-white/10 bg-[#090d10]/80 backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-black/35 to-transparent"}`}>
        <div className="container-x flex items-center justify-between gap-6 py-5">
          <Link href="/#top" onClick={(e) => onAnchor(e, "/#top")} className="flex items-center gap-3.5">
            <Monogram draw />
            <span className="flex flex-col leading-[1.1]">
              <span className="font-serif text-[22px] font-medium tracking-[0.01em] text-[#f4f1eb]">{name}</span>
              <span className="text-[9px] tracking-[0.22em] text-white/45">INVESTOR · CFA LEVEL III CANDIDATE</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 text-[11px] tracking-[0.22em] xl:flex">
            {items.map((n) => (
              <Link key={n.href} href={n.href} onClick={(e) => onAnchor(e, n.href)} className="roll-host group relative py-2 uppercase text-white/70 transition-colors hover:text-ice-deep">
                <RollText>{n.label}</RollText>
                <span className="absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-ice-deep transition-transform duration-500 ease-[var(--ease-expo)] group-hover:origin-left group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-5">
            <MarketClock />
            <button ref={openBtn} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="site-menu"
              data-cursor="Menu" className="roll-host flex h-11 items-center gap-2.5 rounded-full border border-white/25 bg-black/25 px-[18px] text-[11px] tracking-[0.24em] text-white backdrop-blur transition-colors hover:border-ice-deep">
              <RollText>MENU</RollText>
              <span aria-hidden className="flex flex-col gap-1"><span className="block h-px w-4 bg-white" /><span className="block h-px w-2.5 bg-[#c9a779]" /></span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu" role="dialog" aria-modal="true" aria-label="Site menu"
            className="fixed inset-0 z-[90] flex flex-col justify-between overflow-y-auto bg-[#090d10] px-[clamp(20px,3vw,32px)] pb-10 pt-6 text-[#f4f1eb]"
            initial={{ clipPath: "circle(0% at calc(100% - 80px) 44px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 80px) 44px)", transition: { duration: 1, ease: [0.7, 0, 0.2, 1] } }}
            exit={{ clipPath: "circle(0% at calc(100% - 80px) 44px)", transition: { duration: 0.8, ease: [0.7, 0, 0.2, 1] } }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(closest-side,rgba(201,167,121,0.16),transparent)] opacity-80 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <span className="text-[10px] tracking-[0.32em] text-white/45">{name.toUpperCase()}</span>
              <button ref={closeBtn} type="button" onClick={() => { setOpen(false); openBtn.current?.focus(); }}
                className="h-11 rounded-full border border-white/25 px-[18px] text-[11px] tracking-[0.24em] text-white hover:border-[#c9a779]">CLOSE ✕</button>
            </div>
            <nav aria-label="Menu" className="relative flex flex-col">
              {items.map((n, i) => (
                <Link key={n.href} href={n.href} onClick={(e) => { setOpen(false); onAnchor(e, n.href); }} className="group flex items-baseline gap-7 overflow-hidden border-b border-white/10 py-1.5">
                  <span className="tnum w-8 text-[11px] tracking-[0.2em] text-[#c9a779]/70">{pad2(i + 1)}</span>
                  <motion.span
                    className="display block text-[clamp(40px,6.4vw,96px)] leading-[1.04] text-[#f4f1eb] transition-[color,transform] duration-500 group-hover:translate-x-4 group-hover:text-[#d9c09b]"
                    initial={{ y: "110%" }} animate={{ y: 0, transition: { delay: 0.25 + i * 0.05, duration: 1, ease: [0.2, 0.8, 0.2, 1] } }} exit={{ y: "110%", transition: { duration: 0.4 } }}
                  >
                    {n.label}
                  </motion.span>
                </Link>
              ))}
            </nav>
            <div className="relative flex flex-wrap justify-between gap-x-10 gap-y-4 text-xs text-white/45">
              <a href={`mailto:${email}`}>{email}</a>
              <span>{closing}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
