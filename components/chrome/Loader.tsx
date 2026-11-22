"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Monogram from "./Monogram";

/** Opening curtain, shown once per browser session. Content is server-rendered underneath (no SEO cost). */
export default function Loader() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("intro-seen") === "1"; } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) { setShow(false); document.documentElement.dataset.ready = "1"; return; }
    const t = setTimeout(() => {
      setShow(false);
      document.documentElement.dataset.ready = "1";
      window.dispatchEvent(new Event("intro:done"));
      try { sessionStorage.setItem("intro-seen", "1"); } catch {}
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          aria-hidden
          className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-9 bg-ink"
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 1.2, ease: [0.7, 0, 0.2, 1] } }}
        >
          <Monogram size={96} draw duration={1.6} stroke={0.6} />
          <motion.span className="display text-[28px] italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 1 }}>
            Capital with purpose.
          </motion.span>
          <span className="block h-px w-[200px] bg-line">
            <motion.span className="block h-px bg-gold" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.9, ease: [0.6, 0, 0.2, 1] }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
