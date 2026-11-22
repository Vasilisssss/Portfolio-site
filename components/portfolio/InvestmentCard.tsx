"use client";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { Investment } from "@/content/portfolio";
import { valueOf } from "@/content/portfolio";
import { moneyCompact, pct, pad2 } from "@/lib/format";
import CardArt from "@/components/ui/CardArt";

/** Editorial investment card: pointer tilt + art parallax; the whole card is a link to its detail page. */
export default function InvestmentCard({ inv, index }: { inv: Investment; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const art = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el || !art.current) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.from(el, { y: 80, autoAlpha: 0, duration: 1.4, ease: "expo.out", delay: (index % 3) * 0.08, scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    }
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.8, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.8, ease: "power3" });
    const ax = gsap.quickTo(art.current, "x", { duration: 1, ease: "power3" });
    const ay = gsap.quickTo(art.current, "y", { duration: 1, ease: "power3" });
    gsap.set(el, { transformPerspective: 1400 });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      rx(-y * 5); ry(x * 6); ax(x * 16); ay(y * 16);
    };
    const leave = () => { rx(0); ry(0); ax(0); ay(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, { scope: ref });

  const big = inv.layout.span === 7;
  return (
    <Link
      ref={ref}
      href={`/portfolio/${inv.slug}`}
      data-cursor="View"
      className="group flex w-full flex-col overflow-hidden border border-line bg-panel transition-colors duration-500 hover:border-line-2"
      style={{ minHeight: inv.layout.minHeight }}
    >
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: Math.round(inv.layout.minHeight * 0.56), background: index % 2 ? "#0E1012" : "#121416" }}>
        <div ref={art} className="absolute inset-0 transition-transform duration-[900ms] ease-[var(--ease-expo)] group-hover:scale-[1.06]">
          <CardArt kind={inv.art} seed={index + 1} className="h-full w-full" />
        </div>
        <div className="absolute inset-x-6 top-5 flex justify-between text-[10px] tracking-[0.28em] text-silver">
          <span>{pad2(index + 1)} — {inv.category.toUpperCase()}</span>
          <span className="tnum text-gold">{inv.allocation.toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-[18px] border-t border-line px-6 pb-[26px] pt-7">
        <h3 className={`font-serif leading-none tracking-[-0.01em] ${big ? "text-[clamp(32px,3.2vw,46px)]" : "text-[clamp(28px,2.4vw,34px)]"}`}>{inv.name}</h3>
        <dl className="grid grid-cols-3 gap-3 text-[10px] tracking-[0.2em] text-silver">
          <div className="flex flex-col gap-1.5"><dt>VALUE</dt><dd className="tnum text-[15px] tracking-normal text-ivory">{moneyCompact(valueOf(inv))}</dd></div>
          <div className="flex flex-col gap-1.5"><dt>RETURN</dt><dd className="tnum text-[15px] tracking-normal text-ivory">{pct(inv.returnSinceEntry, true)}</dd></div>
          <div className="flex flex-col gap-1.5"><dt>HORIZON</dt><dd className="text-[15px] tracking-normal text-ivory">{inv.horizon}</dd></div>
        </dl>
      </div>
    </Link>
  );
}
