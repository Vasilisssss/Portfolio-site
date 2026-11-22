"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/** Follower cursor for fine pointers. Elements opt in to a label with data-cursor="View". The native cursor stays. */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => { setEnabled(window.matchMedia("(hover: hover) and (pointer: fine)").matches); }, []);

  useEffect(() => {
    if (!enabled || !ring.current || !dot.current) return;
    const rx = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ry = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });
    const dx = gsap.quickTo(dot.current, "x", { duration: 0.08 });
    const dy = gsap.quickTo(dot.current, "y", { duration: 0.08 });
    let last = "";
    const move = (e: PointerEvent) => {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      const t = e.target as Element | null;
      const l = t?.closest?.("[data-cursor]")?.getAttribute("data-cursor") ?? (t?.closest?.("a,button") ? "·" : "");
      if (l !== last) { last = l; setLabel(l); }
    };
    window.addEventListener("pointermove", move, { passive: true });
    gsap.to([ring.current, dot.current], { opacity: 1, duration: 0.4 });
    return () => window.removeEventListener("pointermove", move);
  }, [enabled]);

  if (!enabled) return null;
  const big = label && label !== "·";
  return (
    <>
      <div ref={ring} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[140] opacity-0">
        <div
          className="-ml-[42px] -mt-[42px] flex h-[84px] w-[84px] items-center justify-center rounded-full text-[10px] tracking-[0.22em] text-pearl transition-[transform,background-color,border-color] duration-300 ease-[var(--ease-expo)]"
          style={{ transform: `scale(${big ? 1 : label === "·" ? 0.5 : 0.3})`, background: big ? "var(--color-graphite)" : "transparent", border: `1px solid ${big ? "var(--color-graphite)" : "rgba(243,242,237,0.45)"}` }}
        >
          {big ? label.toUpperCase() : ""}
        </div>
      </div>
      <div ref={dot} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[141] -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-lavender-deep opacity-0" />
    </>
  );
}
