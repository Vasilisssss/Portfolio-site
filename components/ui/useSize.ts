"use client";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Measures an element in CSS pixels so charts can draw in real pixel space
 * (no stretched viewBox): strokes, joins, dots and gradients stay exact at any DPR.
 */
export function useSize<T extends HTMLElement>(fallback = { w: 1000, h: 360 }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0) setSize((s) => (Math.abs(s.w - r.width) < 0.5 && Math.abs(s.h - r.height) < 0.5 ? s : { w: r.width, h: r.height })); };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
