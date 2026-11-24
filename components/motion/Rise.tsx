"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "./gsap";

/**
 * RISE — paragraphs, labels and blocks.
 * Choreography: on entry the targets fade and rise (y 24 → 0, opacity 0 → 1, expo.out). With `stagger`, every
 * element marked [data-rise] inside (or, if there are none, every direct child) arrives in sequence.
 * `y` can be raised for heavier blocks. Nothing moves under reduced motion.
 */
export default function Rise({ children, className, delay = 0, y = 24, stagger = 0, as = "div", start = "top 88%" }: {
  children: React.ReactNode; className?: string; delay?: number; y?: number; stagger?: number; as?: "div" | "ul" | "ol" | "dl" | "section"; start?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const marked = el.querySelectorAll<HTMLElement>("[data-rise]");
    const targets = stagger ? (marked.length ? Array.from(marked) : Array.from(el.children)) : [el];
    gsap.from(targets, { y, autoAlpha: 0, duration: 1.2, ease: "expo.out", delay, stagger, scrollTrigger: { trigger: el, start, once: true } });
  }, { scope: ref });
  const Comp = as as React.ElementType;
  return <Comp ref={ref} className={className}>{children}</Comp>;
}
