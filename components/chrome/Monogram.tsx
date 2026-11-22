"use client";
import { motion } from "framer-motion";

/** The brand mark: a meridian globe drawn in three strokes. */
export default function Monogram({ size = 34, draw = false, duration = 1.8, stroke = 1 }: { size?: number; draw?: boolean; duration?: number; stroke?: number }) {
  const t = (delay: number) => ({ duration, delay, ease: [0.6, 0, 0.2, 1] as const });
  const init = draw ? { pathLength: 0 } : false;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <motion.circle cx="20" cy="20" r="18" stroke="var(--color-gold)" strokeWidth={stroke} initial={init} animate={{ pathLength: 1 }} transition={t(0)} />
      <motion.ellipse cx="20" cy="20" rx="8" ry="18" stroke="var(--color-ivory)" strokeWidth={stroke} initial={init} animate={{ pathLength: 1 }} transition={t(0.25)} />
      <motion.path d="M2 20h36" stroke="var(--color-ivory)" strokeWidth={stroke} initial={init} animate={{ pathLength: 1 }} transition={t(0.5)} />
    </svg>
  );
}
