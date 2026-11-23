"use client";
import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Native browser scrolling is the source of truth for the long-form cinematic page.
 * Keep ScrollTrigger synchronized without placing a second virtual scroll engine
 * between wheel/touch input and the document.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    const update = () => ScrollTrigger.update();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);
    window.addEventListener("intro:done", refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", update, { passive: true });
    const t = window.setTimeout(refresh, 900);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("load", refresh);
      window.removeEventListener("intro:done", refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return null;
}
