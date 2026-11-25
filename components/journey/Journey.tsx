"use client";
import { useEffect, useRef, useState } from "react";
import { gsap, lenis, reducedMotion, finePointer, scrollToTarget } from "@/components/motion/gsap";
import { loadSequence, type Sequence } from "./sequence";
import { createStage, toScreen, type Layer, type Stage, type StageFrame } from "./stage";
import { reportWarm } from "@/components/chrome/warmup";
import { ROOMS, FLOOR, sceneSrc, walkSrc, base, type Variant } from "./scenes";

/**
 * THE JOURNEY — one fixed camera behind the whole home page.
 *
 * Scroll position is the playhead:
 *   hero  [data-walk]     the pinned headquarters walk; its progress picks the walk frame (neighbours cross-fade),
 *                         with a little zoom blur while the camera is moving
 *   cards [data-chapter]  each chapter card (II–V) carries the camera forward into the next room while its top
 *                         travels from the bottom of the viewport to the top (u = Σ of those progresses, 0…4):
 *                           push   the current image scales up around its zoomOrigin (1 → 3, ease-in)
 *                           blur   radial blur around that point, peaking mid-transition, plus scroll velocity
 *                           arrive the next room emerges from that point inside a soft aperture that grows to full
 *                                  screen while it settles from 1.35× to its dwell zoom
 *   dwell [data-scene]    while a chapter is read, the room keeps pushing in slowly (1 → 1.06); fine pointers add
 *                         ±8 px parallax
 * u = 0→1 hands the walk's last frame (inside the revolving door, the trading floor ahead) into the screens room, so walk and rooms are one camera.
 * The canvas only redraws when something changed (the grain is re-seeded on each redraw), never while hidden.
 * Steady frame rate first: while the stage is moving, its frame times are watched; if several of the last 30 come in
 * slow, the stage lowers its render resolution (and blur taps) a step, and raises it again after a long smooth stretch.
 * Reduced motion: nothing is mounted here; the hero and chapter cards show their own still images.
 */
const RAIL = ["Headquarters", "The Capital Engine", "The Investment Gallery", "The Performance Gallery", "The Final Reveal"];
const ROMAN = ["I", "II", "III", "IV", "V"];
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

interface Geometry { walkP: number; u: number; pins: number[]; scenes: number[]; visible: boolean }

function measure(): Geometry {
  const vh = window.innerHeight;
  const hero = document.querySelector<HTMLElement>("[data-walk]");
  let walkP = 0, visible = false;
  if (hero) {
    const r = hero.getBoundingClientRect();
    walkP = clamp01(-r.top / Math.max(1, r.height - vh));
    visible = r.bottom > 0;
  }
  let u = 0;
  const pins: number[] = [], scenes: number[] = [];
  for (let k = 1; k <= 4; k++) {
    const card = document.querySelector<HTMLElement>(`[data-chapter="${k}"]`);
    if (!card) { pins.push(0); scenes.push(0); continue; }
    const r = card.getBoundingClientRect();
    u += clamp01((vh - r.top) / vh);
    pins.push(clamp01(-r.top / Math.max(1, r.height - vh)));
    if (r.top < vh && r.bottom > 0) visible = true;
    const sc = document.querySelector<HTMLElement>(`[data-scene="${k}"]`);
    if (sc) { const s = sc.getBoundingClientRect(); scenes.push(clamp01(-s.top / Math.max(1, s.height - vh))); } else scenes.push(0);
  }
  return { walkP, u, pins, scenes, visible };
}

export default function Journey() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"off" | "on">("off");

  useEffect(() => {
    const el = canvas.current;
    if (!el || reducedMotion()) return;
    setMode("on");
    const low = window.matchMedia("(max-width: 820px)").matches || !!(navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData;
    const probe = document.createElement("canvas");
    const webgl = !!probe.getContext("webgl2");
    let stage: Stage;
    let cv = el;
    const QA = new URLSearchParams(location.search).has("qa");
    try { stage = createStage(cv, { webgl, preserve: QA }); }
    catch (e) {
      // a canvas that has held a WebGL context cannot give a 2D one: swap in a fresh canvas for the fallback
      console.warn("WebGL2 stage unavailable; using the 2D stage.", e);
      const fresh = el.cloneNode(false) as HTMLCanvasElement;
      el.replaceWith(fresh); cv = fresh;
      stage = createStage(cv, { webgl: false });
    }

    const ac = new AbortController();
    let seq: Sequence | null = null;
    const rooms = new Map<string, ImageBitmap>();
    let floor: ImageBitmap | null = null;
    let variant: Variant = "wide";
    let dirty = true, stopped = false, readyFired = false;

    const loadImage = async (url: string) => {
      const r = await fetch(url, { signal: ac.signal });
      if (!r.ok) throw new Error(`${url} ${r.status}`);
      return createImageBitmap(await r.blob());
    };
    const loadRooms = async () => {
      const portrait = window.innerHeight > window.innerWidth * 1.05;
      const v: Variant = `${portrait ? "tall" : "wide"}${low ? "-sm" : ""}` as Variant;
      if (v === variant && rooms.size === ROOMS.length) return;
      variant = v;
      await Promise.all(ROOMS.map(async (s) => {
        const bmp = await loadImage(sceneSrc(s.id, v));
        if (stopped) { bmp.close(); return; }
        rooms.get(s.id)?.close(); rooms.set(s.id, bmp); dirty = true;
      }));
    };
    // media starts at once, behind the opening curtain: the whole walk is fetched (about 9 MB, 4 MB on phones) and its
    // first frames decoded and drawn before the curtain lifts, so scrolling never waits on the network or the decoder.
    // The curtain follows this progress (components/chrome/warmup.ts) and never waits longer than its own cap; the
    // rooms keep loading afterwards.
    const WARM_FRAMES = 1000; // the whole walk (capped at its frame count below)
    reportWarm(0);
    let warmed = false;
    const warmTick = () => {
      if (warmed || stopped) return;
      const n = seq ? Math.min(seq.manifest.frames, WARM_FRAMES) : WARM_FRAMES;
      const fetched = Math.min(seq?.loaded ?? 0, n) / n;
      const decoded = seq ? Math.min(seq.decoded, 8) / 8 : 0;
      const done = !!seq && fetched >= 1 && decoded >= 1 && !!floor && (readyFired || !shown);
      if (done) { warmed = true; window.clearInterval(warmIv); reportWarm(1, true); }
      else reportWarm(0.7 * fetched + 0.15 * decoded + (floor ? 0.1 : 0) + (readyFired ? 0.05 : 0));
    };
    const warmIv = window.setInterval(warmTick, 100);
    const start = async () => {
      try {
        seq = await loadSequence(`${base()}/media/journey`, low, ac.signal);
        seq.onChange(() => { dirty = true; });
        seq.seek(measure().walkP * (seq.manifest.frames - 1));
        floor = await loadImage(walkSrc(seq.manifest.last));
        dirty = true;
        await loadRooms();
      } catch (e) {
        if (!ac.signal.aborted) console.error("Journey media failed to load; the page stays readable without it.", e);
        // never hold the curtain for media that is not coming
        if (!warmed) { warmed = true; window.clearInterval(warmIv); reportWarm(1, true); }
      }
    };
    void start();

    // pointer parallax (fine pointers only), eased
    const par = { x: 0, y: 0 };
    const px = gsap.quickTo(par, "x", { duration: 1.2, ease: "power3" }), py = gsap.quickTo(par, "y", { duration: 1.2, ease: "power3" });
    const onMove = (e: PointerEvent) => { px((e.clientX / window.innerWidth - 0.5) * -16); py((e.clientY / window.innerHeight - 0.5) * -16); dirty = true; };
    if (finePointer()) window.addEventListener("pointermove", onMove, { passive: true });

    const onResize = () => { stage.resize(); dirty = true; void loadRooms(); };
    window.addEventListener("resize", onResize);

    let draws = 0, lastFrame = "", shown = true;
    let lastWalkF = 0, walkSpeed = 0, lastActive = -1, lastKey = "";
    // adaptive quality: frame times of consecutive redraws (a pause between draws is not a slow frame)
    let quality = 1, drewLast = false, smoothRun = 0;
    const times: number[] = [];
    const watch = (deltaMs: number) => {
      if (!drewLast) return;
      times.push(deltaMs); if (times.length > 30) times.shift();
      const slow = times.filter((t) => t > 24).length;
      if (times.length >= 20 && slow >= 6 && quality > 0.56) {
        quality = Math.max(0.55, quality * 0.85); stage.setQuality(quality); times.length = 0; smoothRun = 0; dirty = true;
      } else if (deltaMs < 18 && quality < 1 && ++smoothRun > 600) {
        quality = Math.min(1, quality / 0.85); stage.setQuality(quality); times.length = 0; smoothRun = 0; dirty = true;
      }
    };
    const layerOf = (src: ImageBitmap, key: string, focusX: number, zoom: number, origin: [number, number]): Layer => ({ src, key, focusX, zoom, origin });
    const frameAt = (g: Geometry, dt: number): StageFrame | null => {
      const base: StageFrame = { a: null, b: null, mix: 0, aperture: 1, apCenter: [0.5, 0.5], blur: 0, blurCenter: [0.5, 0.5], dim: 0, parallax: [par.x, par.y], grade: 0 };
      const vel = Math.abs(lenis()?.velocity ?? 0);
      if (g.u < 0.0005) {
        if (!seq) return null;
        const f = g.walkP * (seq.manifest.frames - 1);
        seq.seek(f);
        walkSpeed += (Math.abs(f - lastWalkF) / Math.max(dt, 1 / 120) - walkSpeed) * 0.2;
        lastWalkF = f;
        const p = seq.pair(f);
        if (!p.a) return null;
        base.a = layerOf(p.a, `w${p.ia}`, 0.5, 1, [0.5, 0.5]);
        if (p.b && p.ib !== p.ia) { base.b = layerOf(p.b, `w${p.ib}`, 0.5, 1, [0.5, 0.5]); base.mix = p.t; }
        base.blur = Math.min(0.28, walkSpeed / 90);
        base.blurCenter = [0.5, 0.56];
        return base;
      }
      const uu = Math.min(4, g.u);
      const k = Math.min(3, Math.floor(uu)), t = uu >= 4 ? 1 : uu - k;
      const fromInfo = k === 0 ? FLOOR : ROOMS[k - 1];
      const fromBmp = k === 0 ? floor : rooms.get(ROOMS[k - 1].id);
      const to = ROOMS[k], toBmp = rooms.get(to.id);
      const dwell = (i: number) => 1 + 0.06 * clamp01(0.5 * g.pins[i] + 0.5 * g.scenes[i]);
      const cw = window.innerWidth, ch = window.innerHeight;
      if (t >= 0.999 || !fromBmp) {
        if (!toBmp) return null;
        base.a = layerOf(toBmp, `r${to.id}${variant}`, to.focusX, dwell(k), to.zoomOrigin);
        return base;
      }
      // the transition from → to
      const fromZoom = (k === 0 ? 1 : dwell(k - 1)) * (1 + 2 * Math.pow(t, 2.2));
      const A = layerOf(fromBmp, k === 0 ? "floor" : `r${fromInfo.id}${variant}`, fromInfo.focusX, fromZoom, fromInfo.zoomOrigin);
      base.a = A;
      const c = toScreen(cw, ch, A, fromInfo.zoomOrigin);
      base.apCenter = c; base.blurCenter = c;
      base.blur = Math.min(1, Math.pow(Math.sin(Math.PI * t), 1.3) * 0.8 + Math.min(0.25, vel / 140));
      if (toBmp) {
        const arrive = smooth(0.28, 1, t);
        const zB = 1 + 0.35 * (1 - arrive);
        // B scales about the image point that sits under the aperture centre, so it grows out of that point
        const tmp = layerOf(toBmp, `r${to.id}${variant}`, to.focusX, 1, [0.5, 0.5]);
        const s0 = toScreen(cw, ch, tmp, [0, 0]), s1 = toScreen(cw, ch, tmp, [1, 1]);
        const ob: [number, number] = [(c[0] - s0[0]) / (s1[0] - s0[0]), (c[1] - s0[1]) / (s1[1] - s0[1])];
        base.b = layerOf(toBmp, tmp.key, to.focusX, zB, ob);
        base.mix = 1;
        base.aperture = arrive >= 0.999 ? 1 : arrive;
      }
      base.grade = 0.6;
      return base;
    };

    let lastY = NaN, lastW = 0, lastH = 0, lastPx = 0, lastPy = 0;
    const tick = (time: number, deltaMs: number) => {
      if (stopped || document.hidden) { drewLast = false; return; }
      const drewBefore = drewLast; drewLast = false;
      // nothing scrolled, resized, moved or loaded: no measuring, no drawing
      const y = window.scrollY;
      if (!dirty && y === lastY && window.innerWidth === lastW && window.innerHeight === lastH && par.x === lastPx && par.y === lastPy && walkSpeed < 0.01) return;
      lastY = y; lastW = window.innerWidth; lastH = window.innerHeight; lastPx = par.x; lastPy = par.y;
      if (y === lastY) walkSpeed *= 0.8;
      const g = measure();
      const act = g.u < 0.5 ? 0 : Math.min(4, Math.round(g.u));
      if (act !== lastActive) { lastActive = act; setActive(act); }
      // the stage only exists where a window onto it (the hero or a chapter card) is on screen; elsewhere it steps
      // out of the way entirely so the reveal footer underneath the page can be seen
      if (g.visible !== shown) { shown = g.visible; cv.style.visibility = shown ? "visible" : "hidden"; if (shown) dirty = true; }
      if (!g.visible) return;
      const f = frameAt(g, deltaMs / 1000);
      if (!f) return;
      const key = `${f.a?.key}|${f.a?.zoom.toFixed(4)}|${f.b?.key}|${f.b?.zoom.toFixed(4)}|${f.mix.toFixed(3)}|${f.aperture.toFixed(3)}|${f.blur.toFixed(3)}|${f.parallax[0].toFixed(2)},${f.parallax[1].toFixed(2)}`;
      // render only on change: the grain is re-seeded on every real redraw (and is still while nothing moves)
      if (!dirty && key === lastKey) return;
      dirty = false; lastKey = key;
      f.grade = f.grade || 0;
      stage.draw(f, time);
      drewLast = drewBefore; watch(deltaMs); drewLast = true;
      draws++; lastFrame = `${f.a?.key}@${f.a?.zoom.toFixed(2)} ${f.b?.key}@${f.b?.zoom.toFixed(2)} mix ${f.mix.toFixed(2)} ap ${f.aperture.toFixed(2)} blur ${f.blur.toFixed(2)}`;
      if (!readyFired) { readyFired = true; window.dispatchEvent(new Event("journey:ready")); cv.classList.add("is-ready"); }
    };
    gsap.ticker.add(tick);

    const qa = {
      state: () => ({ ...measure(), quality, frames: seq?.loaded ?? 0, decoded: seq?.decoded ?? 0, rooms: rooms.size, floor: !!floor, kind: stage.kind, ready: readyFired, draws, lastFrame }),
      ready: () => !!seq && !!floor && rooms.size === ROOMS.length && readyFired,
      walkLoaded: () => !!seq && seq.loaded === seq.manifest.frames,
      async settle() { for (let i = 0; i < 120 && seq && !seq.ready(); i++) await new Promise((r) => setTimeout(r, 25)); dirty = true; return qa.state(); },
    };
    if (QA) (window as unknown as { __journey: unknown }).__journey = qa;

    return () => {
      stopped = true; ac.abort();
      window.clearInterval(warmIv);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(tick);
      seq?.dispose(); floor?.close(); rooms.forEach((b) => b.close()); rooms.clear();
      stage.dispose();
      if (cv !== el) cv.replaceWith(el);
    };
  }, []);

  const go = (i: number) => {
    const target = i === 0 ? document.querySelector("[data-walk]") : document.querySelector(`[data-chapter="${i}"]`);
    if (!target) return;
    const y = (target as HTMLElement).getBoundingClientRect().top + window.scrollY + (i === 0 ? 0 : window.innerHeight * 0.02);
    scrollToTarget(i === 0 ? 0 : y);
  };

  return (
    <>
      <canvas ref={canvas} aria-hidden className={`journey-stage ${mode === "on" ? "" : "hidden"}`} />
      {/* scene rail: where you are in the journey, and a way to jump */}
      <nav aria-label="Journey" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        {RAIL.map((s, i) => (
          <button key={s} type="button" onClick={() => go(i)} aria-current={active === i ? "step" : undefined} data-cursor={ROMAN[i]}
            className="group flex items-center justify-end gap-3 text-right">
            <span className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ease-[var(--ease-expo)] ${active === i ? "text-graphite opacity-100" : "translate-x-2 text-mute opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`}>{s}</span>
            <span className={`tnum font-mono text-[10px] tracking-[0.1em] transition-colors duration-500 ${active === i ? "text-ice-deep" : "text-mute"}`}>{ROMAN[i]}</span>
            <span className={`block h-px transition-all duration-700 ease-[var(--ease-expo)] ${active === i ? "w-10 bg-ice-deep" : "w-4 bg-white/30 group-hover:w-6"}`} />
          </button>
        ))}
      </nav>
      <div aria-hidden className="journey-pill fixed bottom-4 left-1/2 z-40 -translate-x-1/2 overflow-hidden rounded-full border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-graphite-2 backdrop-blur-md lg:hidden">
        <span key={active} className="journey-pill-label inline-block"><span className="text-ice-deep">{ROMAN[active]}</span> · {RAIL[active]}</span>
      </div>
    </>
  );
}
