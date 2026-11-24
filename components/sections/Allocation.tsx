"use client";
import { useMemo, useRef, useState } from "react";
import { gsap, useGSAP, reducedMotion } from "@/components/motion/gsap";
import type { PublicView, Slice } from "@/lib/public";
import { money, pct } from "@/lib/format";
import { classColor, RAMP, UNDISCLOSED } from "@/lib/palette";

type Tab = keyof PublicView["allocation"];
const TABS: { key: Tab; label: string }[] = [
  { key: "assetClass", label: "Asset class" },
  { key: "investment", label: "Investment" },
  { key: "geography", label: "Geography" },
  { key: "industry", label: "Industry" },
  { key: "currency", label: "Currency" },
];

const R = 120, SW = 30, C = 2 * Math.PI * R;

/**
 * ALLOCATION — capital in proportion.
 * Choreography: on first entry the donut sweeps its segments in (stroke-dash from 0, staggered) and the bars grow
 * from the left. Switching tabs never swaps hard: every segment morphs from its previous length, offset and colour to
 * the new ones (segments that are not needed collapse to zero), and the bars regrow in sequence.
 */
export default function Allocation({ allocation, currency }: { allocation: PublicView["allocation"]; currency: string }) {
  const tabs = TABS.filter((t) => allocation[t.key].length > 0);
  const [tab, setTab] = useState<Tab>(tabs[0]?.key ?? "assetClass");
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const slices: Slice[] = allocation[tab];
  const color = (s: Slice, i: number) => (s.undisclosed ? UNDISCLOSED : tab === "assetClass" ? classColor(s.key) : RAMP[i % RAMP.length]);
  // one persistent arc per slot across all tabs, so a tab switch can morph rather than remount
  const slotCount = useMemo(() => Math.max(...TABS.map((t) => allocation[t.key].length), 1), [allocation]);
  let acc = 0;
  const geo = Array.from({ length: slotCount }, (_, i) => {
    const sl = slices[i];
    const len = sl ? sl.weight * C : 0;
    const g = { dash: `${Math.max(0, len - 3).toFixed(2)} ${C.toFixed(2)}`, off: (-acc).toFixed(2), stroke: sl ? color(sl, i) : "#2a2e33" };
    acc += len;
    return g;
  });
  const prev = useRef<typeof geo | null>(null);

  useGSAP(() => {
    if (reducedMotion()) { prev.current = geo; return; }
    const arcs = gsap.utils.toArray<SVGCircleElement>("[data-arc]", root.current);
    if (!prev.current) {
      gsap.from(arcs, { attr: { "stroke-dasharray": `0 ${C}` }, duration: 1.6, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: root.current, start: "top 78%", once: true } });
      gsap.from("[data-row-bar]", { scaleX: 0, transformOrigin: "left center", duration: 1.3, ease: "expo.out", stagger: 0.05, scrollTrigger: { trigger: root.current, start: "top 78%", once: true } });
    } else {
      arcs.forEach((a, i) => {
        const from = prev.current![i], to = geo[i];
        gsap.fromTo(a, { attr: { "stroke-dasharray": from.dash, "stroke-dashoffset": from.off, stroke: from.stroke } },
          { attr: { "stroke-dasharray": to.dash, "stroke-dashoffset": to.off, stroke: to.stroke }, duration: 1.1, ease: "power3.inOut", delay: i * 0.03 });
      });
      gsap.from("[data-row-bar]", { scaleX: 0, transformOrigin: "left center", duration: 1, ease: "expo.out", stagger: 0.05 });
      gsap.from("[data-row]", { y: 12, autoAlpha: 0, duration: 0.8, ease: "expo.out", stagger: 0.04 });
    }
    prev.current = geo;
  }, { scope: root, dependencies: [tab] });

  const cur = active >= 0 ? slices[active] : null;
  const max = Math.max(...slices.map((s) => s.weight), 0.0001);

  return (
    <div ref={root} className="glass flex flex-col gap-10 rounded-[28px] p-6 md:p-10">
      <div role="tablist" aria-label="Allocation breakdown" className="flex flex-wrap gap-1 self-start rounded-full bg-white/[0.04] p-1">
        {tabs.map((t) => (
          <button key={t.key} role="tab" type="button" aria-selected={tab === t.key} onClick={() => { setTab(t.key); setActive(-1); }}
            className={`h-10 rounded-full px-5 text-[11px] uppercase tracking-[0.16em] transition-colors ${tab === t.key ? "bg-graphite text-pearl" : "text-mute hover:text-graphite"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-square w-full max-w-[400px]">
          <div aria-hidden className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#24272b,#121417_60%,#0b0c0e)] shadow-[inset_0_1px_0_rgba(243,242,237,0.08),0_30px_60px_-30px_rgba(0,0,0,0.9)]" />
          <svg viewBox="0 0 300 300" className="relative h-full w-full -rotate-90" role="img" aria-label={`Allocation by ${TABS.find((t) => t.key === tab)?.label}: ${slices.map((s) => `${s.label} ${pct(s.weight)}`).join(", ")}`}>
            <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(243,242,237,0.05)" strokeWidth={SW} />
            <circle cx="150" cy="150" r={R + SW / 2 + 9} fill="none" stroke="rgba(243,242,237,0.10)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {geo.map((g, i) => (
              <circle key={i} data-arc cx="150" cy="150" r={R} fill="none" stroke={g.stroke} strokeWidth={active === i ? SW + 10 : SW}
                strokeDasharray={g.dash} strokeDashoffset={g.off} opacity={active === -1 || active === i ? 1 : 0.35}
                className="cursor-pointer transition-[stroke-width,opacity] duration-300" onPointerEnter={() => i < slices.length && setActive(i)} onPointerLeave={() => setActive(-1)} />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-[24%] text-center">
            <span className="label">{cur ? cur.label : TABS.find((t) => t.key === tab)?.label}</span>
            <span className="tnum display text-[clamp(40px,5vw,60px)] leading-none">{cur ? pct(cur.weight) : slices.length}</span>
            <span className="text-[11px] text-mute">{cur ? (cur.value != null ? money(cur.value, currency) : "") : "segments"}</span>
          </div>
        </div>

        <ul className="flex flex-col">
          {slices.map((s, i) => (
            <li key={s.key} data-row>
              <button type="button" onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(-1)} onFocus={() => setActive(i)} onBlur={() => setActive(-1)}
                className={`grid w-full grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line py-3.5 text-left transition-opacity ${active === -1 || active === i ? "opacity-100" : "opacity-45"}`}>
                <span className="h-3 w-3 rounded-full" style={{ background: color(s, i) }} />
                <span className="truncate text-[15px]">{s.label}{s.undisclosed && <span className="ml-2 text-[11px] text-mute">(private)</span>}</span>
                <span className="tnum text-right text-[15px]">{pct(s.weight)}{s.value != null && <span className="ml-3 text-[12px] text-mute">{money(s.value, currency)}</span>}</span>
                <span className="col-start-2 col-end-4 block h-[3px] overflow-hidden rounded-full bg-pearl-2">
                  <span data-row-bar className="block h-full rounded-full" style={{ width: `${(s.weight / max) * 100}%`, background: color(s, i) }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
