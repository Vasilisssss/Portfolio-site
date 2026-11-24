"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "./gsap";

/**
 * ASSEMBLE — grids of tiles (stat panels, KPI rows).
 * Choreography: the tiles ([data-tile]) arrive in a staggered cascade (y 32 → 0, opacity, expo.out) while the
 * hairline grid between them draws itself: horizontal rules ([data-hl]) grow from the left, vertical rules
 * ([data-vl]) from the top, each slightly after the tile it belongs to.
 */
export default function Assemble({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "dl" }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 86%", once: true } });
    tl.from(q("[data-tile]"), { y: 32, autoAlpha: 0, duration: 1.2, ease: "expo.out", stagger: 0.07 }, 0)
      .from(q("[data-hl]"), { scaleX: 0, transformOrigin: "0% 50%", duration: 1.4, ease: "expo.out", stagger: 0.07 }, 0.1)
      .from(q("[data-vl]"), { scaleY: 0, transformOrigin: "50% 0%", duration: 1.4, ease: "expo.out", stagger: 0.07 }, 0.15);
  }, { scope: ref });
  const Comp = as as React.ElementType;
  return <Comp ref={ref} className={className}>{children}</Comp>;
}
