"use client";
import { useEffect, useRef } from "react";

/**
 * Marks the footer as a reveal footer only when it fits inside the viewport: a sticky footer taller than the screen
 * would keep its own closing line hidden under the page.
 */
export default function RevealFit() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const footer = ref.current?.closest("footer");
    if (!footer) return;
    const check = () => { footer.toggleAttribute("data-fit", footer.offsetHeight <= window.innerHeight); };
    check();
    const ro = new ResizeObserver(check); ro.observe(footer);
    window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("resize", check); };
  }, []);
  return <span ref={ref} hidden />;
}
