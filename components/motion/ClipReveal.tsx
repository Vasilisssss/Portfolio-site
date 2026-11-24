"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "./gsap";

/**
 * CLIP REVEAL — images, cards and media frames.
 * Choreography: the frame opens from the bottom (clip-path inset 100% → 0, --ease-curtain) while its contents
 * settle from 1.2× to 1×; afterwards the contents keep a scrubbed inner parallax (yPercent ±8) for as long as the
 * frame is in view, so the image always moves a little slower than the page. Only clip-path and transform animate.
 */
export default function ClipReveal({ children, className, innerClassName, delay = 0, parallax = 8, start = "top 85%", scale = 1.2 }: {
  children: React.ReactNode; className?: string; innerClassName?: string; delay?: number; parallax?: number; start?: string; scale?: number;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i || reducedMotion()) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: o, start, once: true }, delay });
    tl.fromTo(o, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "power4.inOut" })
      .fromTo(i, { scale }, { scale: 1, duration: 1.8, ease: "expo.out" }, 0.1);
    if (parallax) gsap.fromTo(i, { yPercent: parallax }, { yPercent: -parallax, ease: "none", immediateRender: false, scrollTrigger: { trigger: o, start: "top bottom", end: "bottom top", scrub: true } });
  }, { scope: outer });
  return (
    <div ref={outer} className={`overflow-hidden ${className ?? ""}`}>
      <div ref={inner} className={`h-full w-full will-change-transform ${innerClassName ?? ""}`}>{children}</div>
    </div>
  );
}
