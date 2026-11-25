"use client";
import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, reducedMotion } from "./gsap";

type Tag = "h1" | "h2" | "h3" | "p" | "div" | "span";

/**
 * HEADLINE — the site's one way of bringing large type in.
 * Choreography: the text is split into lines inside masks; on entry each line rises from below its mask
 * (yPercent 110 → 0, expo.out, stagger 0.08). While the headline crosses the viewport it drifts up by 6 % of its
 * height, scrubbed, so it moves at a slightly different speed from the page. The outer element carries the
 * scroll-velocity skew (--vskew, max 2°) so fast scrolling leans the type and it settles when you stop.
 * Text is complete in the server HTML; with reduced motion nothing moves.
 */
export default function Headline({ as = "h2", children, className, id, delay = 0, onLoad = false, stagger = 0.08, drift = true, skew = true }: {
  as?: Tag; children: React.ReactNode; className?: string; id?: string; delay?: number; onLoad?: boolean; stagger?: number; drift?: boolean; skew?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let split: SplitText | null = null;
    const tweens: (gsap.core.Tween | ScrollTrigger)[] = [];
    const run = () => {
      split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line", aria: as === "h1" || as === "h2" || as === "h3" ? "auto" : "hidden", autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110, duration: 1.3, ease: "expo.out", stagger, delay,
          scrollTrigger: onLoad ? undefined : { trigger: el, start: "top 90%", once: true },
        }),
      });
      if (drift) tweens.push(gsap.to(el, { yPercent: -6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }));
    };
    if (onLoad && document.documentElement.dataset.ready !== "1") {
      // split now, behind the opening curtain (the split re-lays the text out), and only play when it lifts, so the
      // first seconds after the curtain do no layout work
      let started = false, anim: gsap.core.Tween | null = null;
      split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line", aria: as === "h1" || as === "h2" || as === "h3" ? "auto" : "hidden", autoSplit: true,
        onSplit: (self) => {
          anim = gsap.from(self.lines, { yPercent: 110, duration: 1.3, ease: "expo.out", stagger, delay, paused: !started });
          return anim;
        },
      });
      if (drift) tweens.push(gsap.to(el, { yPercent: -6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }));
      const go = () => { if (started) return; started = true; window.clearTimeout(fb); anim?.play(); };
      const fb = window.setTimeout(go, 9000); // after the curtain's 8 s cap
      window.addEventListener("intro:done", go, { once: true });
      return () => { window.clearTimeout(fb); window.removeEventListener("intro:done", go); split?.revert(); tweens.forEach((t) => t.kill()); };
    }
    run();
    return () => { split?.revert(); tweens.forEach((t) => t.kill()); };
  }, { scope: ref });
  const Comp = as as React.ElementType;
  return (
    <Comp ref={ref} id={id} className={`${skew ? "vskew " : ""}${className ?? ""}`}>{children}</Comp>
  );
}
