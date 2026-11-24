"use client";
import { useRef } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import { money, moneySigned, pct } from "@/lib/format";

export type TickKind = "money" | "moneySigned" | "pct" | "pctSigned" | "int";
const fmt = (v: number, kind: TickKind, cur: string) =>
  kind === "money" ? money(v, cur) : kind === "moneySigned" ? moneySigned(v, cur) : kind === "pct" ? pct(v) : kind === "int" ? String(Math.round(v)) : pct(v, true);

/**
 * COUNT-UP — every figure on the site.
 * Choreography: when the number enters the viewport it counts from 0 to its real value in 1.4 s (expo.out),
 * set in tabular figures so the width never jitters. The real value is in the server HTML (and stays there under
 * reduced motion); values only ever come from getPublicView() through props.
 */
export default function Ticker({ value, kind, currency = "USD", className, delay = 0 }: { value: number; kind: TickKind; currency?: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    const o = { v: 0 };
    el.textContent = fmt(0, kind, currency);
    gsap.to(o, {
      v: value, duration: 1.4, ease: "expo.out", delay,
      scrollTrigger: { trigger: el, start: "top 94%", once: true },
      onUpdate: () => { el.textContent = fmt(o.v, kind, currency); },
      onComplete: () => { el.textContent = fmt(value, kind, currency); },
    });
    return () => { el.textContent = fmt(value, kind, currency); };
  }, { scope: ref, dependencies: [value] });
  return <span ref={ref} className={`tnum ${className ?? ""}`}>{fmt(value, kind, currency)}</span>;
}
