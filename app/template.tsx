"use client";
import { motion } from "framer-motion";

// The first page a visitor lands on is not faded in: the intro curtain already covers it, and content painted at
// opacity 0 can never be the Largest Contentful Paint (the hero poster must be). Later navigations fade as before.
let landed = false;

/**
 * Route transition: a pearl curtain lifts as the new page fades in.
 * Opacity only — a lingering CSS transform here would break pinned/fixed layers (the journey stage).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const first = !landed;
  landed = true;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[110] bg-pearl-2"
        initial={first ? false : { clipPath: "inset(0 0 0 0)" }}
        animate={{ clipPath: "inset(0 0 100% 0)" }}
        transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }}
      />
      <motion.div initial={first ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.div>
    </>
  );
}
