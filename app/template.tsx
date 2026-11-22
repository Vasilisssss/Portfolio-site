"use client";
import { motion } from "framer-motion";

/** Route transition: content rises in under a closing ivory curtain. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[110] bg-charcoal"
        initial={{ clipPath: "inset(0 0 0 0)" }}
        animate={{ clipPath: "inset(0 0 100% 0)" }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }}
      />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.div>
    </>
  );
}
