"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "./gsap";

/**
 * DRIFT — very large type that slides sideways with scroll.
 * Choreography: while the element crosses the viewport it travels horizontally from `from`% to `to`% of its width
 * (scrubbed, linear), so the closing words keep moving as the page ends.
 */
export default function Drift({ children, className, from = 6, to = -8 }: { children: React.ReactNode; className?: string; from?: number; to?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || reducedMotion()) return;
    gsap.fromTo(ref.current, { xPercent: from }, { xPercent: to, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
  }, { scope: ref });
  return <div ref={ref} className={`will-change-transform ${className ?? ""}`}>{children}</div>;
}
