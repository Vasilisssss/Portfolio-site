"use client";
/**
 * Compatibility exports for pages outside the home journey (investment and other detail pages):
 * RevealText → the shared masked line reveal (components/motion/Headline), Reveal → fade-rise (components/motion/Rise).
 */
import Headline from "@/components/motion/Headline";
import Rise from "@/components/motion/Rise";

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span";

export function RevealText({ as = "div", children, className, id, delay = 0, onLoad = false, stagger = 0.08 }: {
  as?: Tag; children: React.ReactNode; className?: string; id?: string; delay?: number; onLoad?: boolean; stagger?: number;
}) {
  return <Headline as={as} className={className} id={id} delay={delay} onLoad={onLoad} stagger={stagger} drift={!onLoad}>{children}</Headline>;
}

export function Reveal({ children, className, delay = 0, y = 48 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return <Rise className={className} delay={delay} y={y}>{children}</Rise>;
}
