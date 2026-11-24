"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Monogram from "./Monogram";
import { warmState } from "./warmup";

/**
 * Opening curtain, once per browser session. Content is server-rendered underneath, and the journey's media loads
 * behind it (see warmup.ts), so the first scroll is smooth.
 */
export default function Loader({ line }: { line: string }) {
  const [show, setShow] = useState(true);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("intro-seen") === "1"; } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const done = () => { setShow(false); document.documentElement.dataset.ready = "1"; window.dispatchEvent(new Event("intro:done")); };
    if (seen || reduce) { done(); return; }
    // The curtain stays up for at least MIN and until the page's warm-up (the journey's first walk frames, fetched,
    // decoded and drawn once) reports done, but never longer than CAP. The counter and line follow the real
    // progress, never running ahead of it, eased so it still reads as one calm count.
    const MIN = 1600, CAP = 5000;
    const t0 = performance.now();
    let shown = 0, raf = 0, finished = false;
    const step = () => {
      const el = performance.now() - t0;
      const time = 1 - Math.pow(1 - Math.min(1, el / 1400), 3);
      const w = warmState();
      const real = w ? (w.done ? 1 : w.p) : 1;
      const target = el >= CAP ? 1 : Math.min(time, real);
      shown += (target - shown) * 0.14;
      if (target === 1 && shown > 0.995) shown = 1;
      if (counter.current) counter.current.textContent = String(Math.floor(shown * 100)).padStart(2, "0");
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`;
      if (shown === 1 && el >= MIN) {
        if (!finished) { finished = true; done(); try { sessionStorage.setItem("intro-seen", "1"); } catch {} }
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
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
            <span ref={bar} className="block h-px origin-left scale-x-0 bg-lime" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
