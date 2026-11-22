"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** Moves its children vertically at a different speed from the page while in view (scrubbed). */
export default function Parallax({ children, speed = 0.3, className }: { children: React.ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(ref.current, { yPercent: speed * 60 }, { yPercent: -speed * 60, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
  }, { scope: ref });
  return <div ref={ref} aria-hidden className={className}>{children}</div>;
}
