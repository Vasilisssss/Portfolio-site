"use client";
/**
 * One place where GSAP and its plugins are registered, plus the media checks every motion component shares.
 * Import gsap/ScrollTrigger/SplitText from here so registration always happens exactly once.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
gsap.defaults({ ease: "expo.out" });
// optional parts (a chapter without figures, a table row without cells) are normal here, not mistakes
gsap.config({ nullTargetWarn: false });

export { gsap, ScrollTrigger, SplitText, useGSAP };

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** The scroll engine (Lenis) when it is running, for programmatic scrolls that should stay smooth. */
export interface LenisLike { scrollTo(target: Element | number | string, opts?: { immediate?: boolean; offset?: number; duration?: number }): void; stop(): void; start(): void; velocity: number }
export const lenis = (): LenisLike | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { __lenis?: LenisLike }).__lenis);

/** Scroll to an element or y position through Lenis when available. */
export function scrollToTarget(target: Element | number, immediate = false) {
  const l = lenis();
  if (l) l.scrollTo(target, { immediate, offset: 0 });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: immediate || reducedMotion() ? "auto" : "smooth" });
  else target.scrollIntoView({ behavior: immediate || reducedMotion() ? "auto" : "smooth" });
}
