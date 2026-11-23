"use client";
import { useEffect, useRef, useState } from "react";
import type { WorldData, LabelOut } from "./engine";

export interface WorldLabel { id: string; title: string; lines: string[]; holdingId?: string; assetClass?: string }

export const SCENES = ["The Reveal", "The Capital Engine", "The Investment Gallery", "The Performance Gallery", "The Final Reveal"];
const ROMAN = ["I", "II", "III", "IV", "V"];

const clamp = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Fixed full-screen WebGL world behind the home page. Scroll position drives the camera:
 * while chapter i (a full-height title card, [data-chapter=i]) scrolls into view, the camera travels from scene i-1 to scene i
 * (from 0 to 1 the case unlocks, opens and its model rises).
 * While the content of a scene is read, the camera drifts gently around it.
 */
export default function World({ data, labels }: { data: WorldData; labels: WorldLabel[] }) {
  const host = useRef<HTMLDivElement>(null);
  const labelEls = useRef<Map<string, HTMLDivElement>>(new Map());
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let world: { setProgress: (u: number, d: number) => void; dispose: () => void } | null = null;
    let disposed = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const low = window.matchMedia("(max-width: 820px), (pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;

    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) { setOk(false); return; }

    const byId = new Map(labels.map((l) => [l.id, l]));
    let lastActive = -1;
    let gate = 1; // 3D labels show while a scene's chapter card is on screen, then step back for the content
    const progress = () => {
      const y = window.scrollY, vh = window.innerHeight;
      let u = 0;
      document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((ch) => {
        const top = ch.getBoundingClientRect().top + y;
        u += clamp((y - (top - vh)) / vh);
      });
      const cur = Math.round(u);
      const wrap = document.querySelector<HTMLElement>(`[data-scene="${cur}"]`);
      let drift = 0;
      if (wrap && Math.abs(u - cur) < 0.02) {
        const r = wrap.getBoundingClientRect();
        drift = clamp(-r.top / Math.max(1, r.height - vh)) - 0.5;
      }
      const ch = document.querySelector<HTMLElement>(`[data-chapter="${cur}"]`);
      gate = ch ? clamp((ch.getBoundingClientRect().bottom - vh * 0.15) / (vh * 0.35)) : 0;
      world?.setProgress(u, drift);
      if (cur !== lastActive) { lastActive = cur; setActive(cur); }
    };

    // the page's text and data come first; the world is built once the browser is idle after load
    const boot = () => import("./engine").then(({ createWorld }) => {
      if (disposed) return;
      try {
        world = createWorld(el, data, { low, reduce }, {
          onLabels: (list: LabelOut[]) => {
            // collision avoidance: larger holdings first; a label that would overlap one already placed steps aside
            const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
            const vw = window.innerWidth;
            const maxX = vw >= 1024 ? vw - 270 : vw - 16; // desktop: stay clear of the scene rail
            for (const l of list) {
              const node = labelEls.current.get(l.id);
              if (!node) continue;
              const w = node.offsetWidth || 140, h = node.offsetHeight || 48;
              const x = Math.min(maxX - w / 2, Math.max(16 + w / 2, l.x));
              const box = { x0: x - w / 2, x1: x + w / 2, y0: l.y - h, y1: l.y };
              const clash = l.opacity > 0.02 && placed.some((p) => box.x0 < p.x1 + 6 && p.x0 < box.x1 + 6 && box.y0 < p.y1 + 4 && p.y0 < box.y1 + 4);
              if (l.opacity > 0.02 && !clash) placed.push(box);
              node.style.transform = `translate3d(${x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
              const o = clash ? 0 : l.opacity * gate;
              node.style.opacity = o.toFixed(3);
              node.style.visibility = o > 0.02 ? "visible" : "hidden";
            }
          },
          onHover: (id) => setHovered(id),
          onSelect: (id) => {
            const l = byId.get(`district:${id}`) ?? byId.get(`engine:${id}`);
            if (l?.assetClass) window.dispatchEvent(new CustomEvent("filter:class", { detail: l.assetClass }));
            const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element) => void } }).__lenis;
            const target = document.getElementById("investments");
            if (target) { if (lenis) lenis.scrollTo(target); else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
          },
        });
        el.querySelector("canvas")?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 0 : 1600, easing: "ease-out" });
        progress();
      } catch (e) {
        console.error("3D world failed to start; showing the static fallback.", e);
        setOk(false);
      }
    });
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const whenIdle = () => (ric ? ric(() => void boot(), { timeout: 1500 }) : setTimeout(() => void boot(), 300));
    if (document.readyState === "complete") whenIdle(); else window.addEventListener("load", whenIdle, { once: true });

    window.addEventListener("scroll", progress, { passive: true });
    window.addEventListener("resize", progress);
    return () => {
      disposed = true;
      window.removeEventListener("scroll", progress);
      window.removeEventListener("resize", progress);
      world?.dispose();
    };
  }, [data, labels]);

  const go = (i: number) => {
    const target = i === 0 ? document.body : document.querySelector(`[data-chapter="${i}"]`);
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element | number) => void } }).__lenis;
    if (i === 0) { if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (target) { if (lenis) lenis.scrollTo(target); else target.scrollIntoView({ behavior: "smooth" }); }
  };

  return (
    <>
      <div ref={host} aria-hidden className="fixed inset-0 z-0" />
      {/* cinematic vignette + scrims keep text readable over the 3D */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(8,9,10,0.85))]" />
      {ok && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {labels.map((l) => (
            <div key={l.id} ref={(n) => { if (n) labelEls.current.set(l.id, n); else labelEls.current.delete(l.id); }}
              className="absolute left-0 top-0 hidden whitespace-nowrap md:block" style={{ opacity: 0, visibility: "hidden" }}>
              <div className={`flex flex-col items-center gap-1 transition-transform duration-300 ${hovered && l.holdingId === hovered ? "scale-110" : ""}`}>
                <span className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] backdrop-blur-md ${hovered && l.holdingId === hovered ? "border-lime bg-lime text-black" : "border-white/15 bg-black/55 text-graphite"}`}>{l.title}</span>
                {l.lines.map((ln, i) => <span key={i} className="font-mono text-[11px] tracking-[0.08em] text-graphite-2 [text-shadow:0_1px_8px_#000]">{ln}</span>)}
                <span className="mt-1 h-6 w-px bg-gradient-to-b from-white/50 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      )}
      {/* scene rail: where am I in the journey + direct navigation */}
      <nav aria-label="Journey" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        {SCENES.map((s, i) => (
          <button key={s} type="button" onClick={() => go(i)} aria-current={active === i ? "step" : undefined}
            className="group flex items-center justify-end gap-3 text-right">
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${active === i ? "text-graphite opacity-100" : "translate-x-2 text-mute opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`}>{s}</span>
            <span className={`font-mono text-[10px] tracking-[0.1em] ${active === i ? "text-lime" : "text-mute"}`}>{ROMAN[i]}</span>
            <span className={`block h-px transition-all duration-500 ${active === i ? "w-10 bg-lime" : "w-4 bg-white/30 group-hover:w-6"}`} />
          </button>
        ))}
      </nav>
      <div aria-hidden className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-graphite-2 backdrop-blur-md lg:hidden">
        <span className="text-lime">{ROMAN[active]}</span> · {SCENES[active]}
      </div>
    </>
  );
}
