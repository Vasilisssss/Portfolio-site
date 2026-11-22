"use client";
import { useId } from "react";
import { monotonePath, type Pt } from "@/lib/chart";
import { useSize } from "@/components/ui/useSize";

/** Trend line drawn in real pixel space (crisp at any DPR), passing exactly through each month-end value. */
export default function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const [ref, { w, h }] = useSize<HTMLDivElement>({ w: 600, h: 240 });
  const uid = useId().replace(/:/g, "");
  const mn = Math.min(...values), mx = Math.max(...values);
  const padT = 28, padB = 28, padX = 0, padR = 18;
  const X = (i: number) => padX + (i / Math.max(1, values.length - 1)) * (w - padX - padR);
  const Y = (v: number) => padT + (1 - (v - mn) / (mx - mn || 1)) * (h - padT - padB);
  const pts = values.map((v, i) => [X(i), Y(v)] as Pt);
  const line = monotonePath(pts);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className={className} role="img" aria-label={label}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="block overflow-visible" shapeRendering="geometricPrecision">
        <defs>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d7ff3f" stopOpacity="0.22" /><stop offset="1" stopColor="#d7ff3f" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${uid}l`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f3f2ed" stopOpacity="0.8" /><stop offset="1" stopColor="#d7ff3f" /></linearGradient>
        </defs>
        <path d={`M0 ${Math.round(h - padB) + 0.5}H${w}`} stroke="#f3f2ed" strokeOpacity={0.08} shapeRendering="crispEdges" />
        <path d={`${line}L${last[0].toFixed(2)} ${h}L${pts[0][0]} ${h}Z`} fill={`url(#${uid}f)`} />
        <path d={line} fill="none" stroke="#d7ff3f" strokeOpacity={0.14} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line} fill="none" stroke={`url(#${uid}l)`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r={9} fill="#d7ff3f" fillOpacity={0.15} />
        <circle cx={last[0]} cy={last[1]} r={3.5} fill="#d7ff3f" stroke="#08090a" strokeWidth={1.5} />
      </svg>
    </div>
  );
}
