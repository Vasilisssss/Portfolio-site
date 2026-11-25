"use client";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, reducedMotion, finePointer } from "./gsap";

/**
 * STACK — sections that layer like sheets.
 * Choreography: while the next sheet ([data-sheet]) slides up over the current one, the current one is held in
 * place (translated down by exactly the distance scrolled, so its bottom stays on the bottom of the viewport),
 * scales to 0.96 and darkens under a page-colour veil — the page reads as a pile of layers rather than one long
 * column. The hold is a transform, not CSS sticky: a sticky opaque layer can make Chromium skip compositing the
 * fixed journey canvas beneath the following chapter card. Only transform and opacity animate.
 * While held, the sheet (and its veil) get their own GPU layer, so scaling and dimming it never repaints its content.
 * Touch screens: the hold is skipped (the covered sheet scrolls away normally and only darkens). Touch scrolling runs
 * on the compositor while the hold is applied from script a frame later, so a held sheet visibly jitters there.
 * Disabled under reduced motion (the sheets simply follow each other).
 */
export default function Stack({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const root = ref.current;
    if (!root || reducedMotion()) return;
    const sheets = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-sheet]"));
    sheets.forEach((s, i) => { s.style.zIndex = String(2 + i); });
    // the hold needs scroll and transform in the same frame: true with a mouse/trackpad (smooth scroll drives both)
    const hold = finePointer();
    sheets.forEach((s, i) => {
      const next = sheets[i + 1];
      if (!next) return;
      const veil = s.querySelector<HTMLElement>(":scope > [data-veil]");
      const layer = (on: boolean) => {
        gsap.set(s, { willChange: on && hold ? "transform" : "auto" });
        if (veil) gsap.set(veil, { willChange: on ? "opacity" : "auto" });
      };
      const tl = gsap.timeline({ scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true, onToggle: (st) => layer(st.isActive) } });
      if (hold) tl.fromTo(s, { y: 0, scale: 1 }, { y: () => window.innerHeight, scale: 0.96, transformOrigin: "50% 100%", ease: "none" }, 0);
      if (veil) tl.fromTo(veil, { opacity: 0 }, { opacity: 0.72, ease: "none" }, 0);
    });
    void ScrollTrigger;
  }, { scope: ref });
  return <div ref={ref} className={`stack ${className ?? ""}`}>{children}</div>;
}

/** One layer of a Stack. The veil is the darkening layer drawn over it while the next sheet covers it. */
export function Sheet({ children, className, id, ...rest }: { children: React.ReactNode; className?: string; id?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-sheet id={id} className={`sheet ${className ?? ""}`} {...rest}>
      {children}
      <div data-veil aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-pearl opacity-0" />
    </div>
  );
}
