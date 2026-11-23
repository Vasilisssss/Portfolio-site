"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span";

/**
 * Masked line-by-line text reveal on scroll (or immediately with `onLoad`).
 * Text is fully present in server HTML; JS only animates it.
 */
export function RevealText({ as = "div", children, className, id, delay = 0, onLoad = false, stagger = 0.09 }: {
  as?: Tag; children: React.ReactNode; className?: string; id?: string; delay?: number; onLoad?: boolean; stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let split: SplitText | null = null;
    const run = () => {
      split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line", aria: "none" });
      const tween = gsap.from(split.lines, {
        yPercent: 110, duration: 1.3, ease: "expo.out", stagger, delay,
        scrollTrigger: onLoad ? undefined : { trigger: el, start: "top 88%", once: true },
      });
      return tween;
    };
    const ready = document.documentElement.dataset.ready === "1";
    if (onLoad && !ready) {
      gsap.set(el, { autoAlpha: 0 });
      let started = false;
      let fallback: ReturnType<typeof setTimeout>;
      const go = () => {
        if (started) return;
        started = true;
        clearTimeout(fallback);
        gsap.set(el, { autoAlpha: 1 });
        run();
      };
      window.addEventListener("intro:done", go, { once: true });
      fallback = setTimeout(go, 2000);
      return () => { clearTimeout(fallback); window.removeEventListener("intro:done", go); split?.revert(); };
    }
    run();
    return () => split?.revert();
  }, { scope: ref });
  const Comp = as as React.ElementType;
  return <Comp ref={ref} id={id} className={className}>{children}</Comp>;
}

/** Fade-and-rise block reveal. */
export function Reveal({ children, className, delay = 0, y = 48 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.from(ref.current, { y, autoAlpha: 0, duration: 1.4, ease: "expo.out", delay, scrollTrigger: { trigger: ref.current, start: "top 90%", once: true } });
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}
