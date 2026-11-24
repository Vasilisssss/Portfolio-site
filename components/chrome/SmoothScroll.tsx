"use client";
import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, reducedMotion } from "@/components/motion/gsap";
import { WARM_EVENT, warmState } from "./warmup";

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so every ScrollTrigger reads the same scroll position on the
 * same frame. Scroll velocity also leans every element marked .vskew (large type) by up to ±2° (skewY through
 * GSAP, so it composes with each element's own scrubbed transforms) and settles back to 0 when scrolling stops;
 * --vel (0…1) is published as a CSS variable for anything else that wants to react to speed.
 * Triggers are recomputed once fonts, the page load and the journey warm-up have settled the layout (all behind the
 * opening curtain), and scrolling is held while the curtain is up.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    // once the journey has warmed up, re-measure behind the curtain, so the first visible frame does no layout work
    const onWarm = () => { if (warmState()?.done && !warmed) { warmed = true; refresh(); } };
    let warmed = false;
    window.addEventListener(WARM_EVENT, onWarm);
    const t = window.setTimeout(refresh, 1200);
    return () => { window.clearTimeout(t); window.removeEventListener("load", refresh); window.removeEventListener(WARM_EVENT, onWarm); };
  }, []);

  useEffect(() => {
    if (reducedMotion()) return;
    const l = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false, anchors: { offset: 0 } });
    (window as unknown as { __lenis?: Lenis }).__lenis = l;
    const release = () => l.start();
    if (document.documentElement.dataset.ready !== "1") { l.stop(); window.addEventListener("intro:done", release, { once: true }); }
    l.on("scroll", ScrollTrigger.update);
    const root = document.documentElement.style;
    let skew = 0, vel = 0, applied = 0;
    let leaners: HTMLElement[] = [];
    const collect = () => { leaners = Array.from(document.querySelectorAll<HTMLElement>(".vskew")); };
    collect();
    ScrollTrigger.addEventListener("refresh", collect);
    const tick = (time: number) => {
      l.raf(time * 1000);
      // velocity → skew / speed, critically damped so it settles without wobble
      const v = gsap.utils.clamp(-1, 1, l.velocity / 60);
      skew += (v * 2 - skew) * 0.12;
      vel += (Math.abs(v) - vel) * 0.12;
      if (Math.abs(skew) < 0.001) skew = 0;
      if (Math.abs(skew - applied) > 0.004) { applied = skew; gsap.set(leaners, { skewY: skew }); }
      root.setProperty("--vel", vel.toFixed(3));
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("intro:done", release);
      l.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      ScrollTrigger.removeEventListener("refresh", collect);
      gsap.set(leaners, { skewY: 0 });
      root.removeProperty("--vel");
    };
  }, []);
  return null;
}
