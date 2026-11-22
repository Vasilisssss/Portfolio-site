"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Monogram from "./Monogram";

/** Opening curtain, once per browser session. Content is server-rendered underneath. */
export default function Loader({ line }: { line: string }) {
  const [show, setShow] = useState(true);
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("intro-seen") === "1"; } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => { setShow(false); document.documentElement.dataset.ready = "1"; window.dispatchEvent(new Event("intro:done")); };
    if (seen || reduce) { done(); return; }
    const t = setTimeout(() => { done(); try { sessionStorage.setItem("intro-seen", "1"); } catch {} }, 2100);
    // 00 → 100 counter, eased to match the progress line
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / 1800);
      const eased = 1 - Math.pow(1 - p, 3);
      if (counter.current) counter.current.textContent = String(Math.round(eased * 100)).padStart(2, "0");
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader" aria-hidden
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-9 bg-pearl"
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 1.2, ease: [0.7, 0, 0.2, 1] } }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
        >
          <Monogram size={96} draw duration={1.6} stroke={0.6} />
          <motion.span className="display text-[28px] italic text-graphite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}>{line}</motion.span>
          <span ref={counter} className="tnum display absolute bottom-8 right-8 text-[clamp(64px,12vw,180px)] leading-none text-graphite/90">00</span>
          <span className="block h-px w-[200px] bg-line">
            <motion.span className="block h-px bg-gradient-to-r from-ice-deep via-lavender-deep to-aqua-deep" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.8, ease: [0.6, 0, 0.2, 1] }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
