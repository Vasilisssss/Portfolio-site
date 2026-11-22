"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { money, moneySigned, pct } from "@/lib/format";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type TickKind = "money" | "moneySigned" | "pct" | "pctSigned";
const fmt = (v: number, kind: TickKind, cur: string) =>
  kind === "money" ? money(v, cur) : kind === "moneySigned" ? moneySigned(v, cur) : kind === "pct" ? pct(v) : pct(v, true);

/** Counts up to its value when scrolled into view. The final value is in the server HTML. */
export default function Ticker({ value, kind, currency = "USD", className }: { value: number; kind: TickKind; currency?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const o = { v: 0 };
    gsap.to(o, {
      v: value, duration: 2, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
      onStart: () => { el.textContent = fmt(0, kind, currency); },
      onUpdate: () => { el.textContent = fmt(o.v, kind, currency); },
      onComplete: () => { el.textContent = fmt(value, kind, currency); },
    });
  }, { scope: ref, dependencies: [value] });
  return <span ref={ref} className={`tnum ${className ?? ""}`}>{fmt(value, kind, currency)}</span>;
}
