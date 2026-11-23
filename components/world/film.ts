import type { LabelOut, WorldCallbacks, WorldData } from "./types";

/**
 * THE WORLD INSIDE A BRIEFCASE — the photographic version.
 *
 * The world is a path-traced film (Blender Cycles, tools/film): one continuous camera move from a closed
 * aluminium briefcase in a dark studio, into the 1 : 110 trading hall inside it, down to eye level, through the
 * gallery and the performance wall, and back out into the open case. Scroll progress u ∈ [0, 4] scrubs it:
 *   u = 0  the closed case · 1 the trading floor · 2 the gallery · 3 the performance wall · 4 the open case
 * At each whole u the film rests on a full-resolution still ("hold"); between them it plays rendered motion frames,
 * cross-faded frame to frame. While a scene's text is read, the hold drifts very slightly, like a camera on a slider.
 *
 * Labels: every frame carries the screen position of each label anchor (projected in Blender), so the page's
 * HTML labels sit exactly on the rendered objects.
 */
interface Manifest {
  w: number; h: number;
  holds: { u: number; fx: number; hi: string; lo: string; labels: Record<string, [number, number]> }[];
  seq: { w: number; h: number; hi: string; lo: string; frames: { u: number; fx: number; labels: Record<string, [number, number]> }[] };
  asOf?: string;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const HOLD_RADIUS = 0.035;   // |u − k| below which the full-resolution still takes over
const WINDOW = 10;           // motion frames kept decoded on each side of the playhead

/** which labels belong to which scene: the gallery's plinths (u = 2) and the performance wall's ends (u = 3) */
function labelScene(id: string) { return id.startsWith("district:") ? 2 : id.startsWith("obs:") ? 3 : -1; }

export function createWorld(host: HTMLElement, _data: WorldData, opts: { low: boolean; reduce: boolean }, cb: WorldCallbacks) {
  const BASE = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/film`;
  const QA = typeof location !== "undefined" && new URLSearchParams(location.search).has("qa");
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true })!;

  let manifest: Manifest | null = null;
  const holdBitmaps = new Map<number, ImageBitmap>();
  const seqBlobs = new Map<number, Blob>();
  const seqBitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  let uTarget = 0, uNow = 0, drift = 0, driftNow = 0, dirty = true, stopped = false, manual = false;
  const abort = new AbortController();

  // ---------- sizing: native device resolution (capped at 2×) so the stills stay sharp
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  // ---------- loading: the current scene's still first, then the others, then motion frames nearest the playhead
  const fetchBlob = async (path: string) => {
    const r = await fetch(`${BASE}/${path}`, { signal: abort.signal });
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.blob();
  };
  const seqIndexAt = (u: number) => {
    const fr = manifest!.seq.frames;
    let lo = 0, hi = fr.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fr[mid].u <= u) lo = mid; else hi = mid; }
    const span = fr[hi].u - fr[lo].u;
    return { i0: lo, i1: hi, a: span > 0 ? clamp01((u - fr[lo].u) / span) : 0 };
  };
  const decodeSeq = (i: number) => {
    const b = seqBlobs.get(i);
    if (!b || seqBitmaps.has(i) || decoding.has(i)) return;
    decoding.add(i);
    createImageBitmap(b).then((bmp) => {
      decoding.delete(i);
      if (stopped) { bmp.close(); return; }
      seqBitmaps.set(i, bmp); dirty = true;
    }, () => decoding.delete(i));
  };
  /** keep a window of decoded motion frames around the playhead; compressed frames stay in memory as blobs */
  const manageWindow = () => {
    if (!manifest || opts.reduce) return;
    const { i0 } = seqIndexAt(uNow);
    for (let d = 0; d <= WINDOW; d++) { decodeSeq(i0 + d); if (d) decodeSeq(i0 - d); }
    for (const [i, bmp] of seqBitmaps) if (Math.abs(i - i0) > WINDOW + 6) { bmp.close(); seqBitmaps.delete(i); }
  };
  const load = async () => {
    const r = await fetch(`${BASE}/manifest.json`, { signal: abort.signal });
    manifest = (await r.json()) as Manifest;
    const m = manifest;
    labelIds = [...new Set([...m.holds.flatMap((h) => Object.keys(h.labels)), ...m.seq.frames.flatMap((f) => Object.keys(f.labels))])];
    const order = [...m.holds].sort((a, b) => Math.abs(a.u - uTarget) - Math.abs(b.u - uTarget));
    for (const h of order) {
      const blob = await fetchBlob(opts.low ? h.lo : h.hi);
      const bmp = await createImageBitmap(blob);
      if (stopped) { bmp.close(); return; }
      holdBitmaps.set(h.u, bmp); dirty = true;
    }
    if (opts.reduce) return;
    // motion frames: nearest the playhead first, four requests in flight
    const queue = m.seq.frames.map((_, i) => i);
    const pending = new Set(queue);
    const next = () => {
      if (!pending.size) return -1;
      const { i0 } = seqIndexAt(uTarget);
      let best = -1, bd = Infinity;
      for (const i of pending) { const d = Math.abs(i - i0); if (d < bd) { bd = d; best = i; } }
      pending.delete(best); return best;
    };
    const worker = async () => {
      for (let i = next(); i >= 0 && !stopped; i = next()) {
        try { seqBlobs.set(i, await fetchBlob((opts.low ? m.seq.lo : m.seq.hi).replace("{i}", String(i).padStart(4, "0")))); manageWindow(); } catch (e) { if (stopped) return; console.warn("film frame", i, e); }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  };
  load().catch((e) => { if (!stopped) console.error("Film failed to load.", e); });

  // ---------- drawing
  /** cover-fit; when the screen is narrower than the film, the crop follows the subject (fx: its position across the frame) */
  let fxNow = 0.5;
  const cover = (iw: number, ih: number, zoom: number, panX: number) => {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / iw, ch / ih) * zoom;
    const dx = Math.min(0, Math.max(cw - iw * s, cw / 2 - fxNow * iw * s));
    return { s, dx: dx + panX * cw, dy: (ch - ih * s) / 2 };
  };
  let labelIds: string[] = [];
  const nearestSeq = (i: number) => {
    if (seqBitmaps.has(i)) return seqBitmaps.get(i)!;
    for (let d = 1; d < 6; d++) { const b = seqBitmaps.get(i - d) ?? seqBitmaps.get(i + d); if (b) return b; }
    return null;
  };
  const draw = () => {
    if (!manifest) return;
    const m = manifest;
    const cw = canvas.width, ch = canvas.height;
    const k = Math.round(uNow), dh = Math.abs(uNow - k);
    { // subject position at the playhead, for portrait crops
      const { i0, i1, a } = seqIndexAt(uNow);
      const f0 = m.seq.frames[i0]?.fx ?? 0.5, f1 = m.seq.frames[i1]?.fx ?? 0.5;
      const hf = m.holds.find((h) => h.u === k)?.fx ?? 0.5;
      const sf = f0 + (f1 - f0) * a, w = smooth(0.3, 0, dh);   // the crop eases toward the scene's subject on arrival
      fxNow = m.seq.frames.length > 1 ? sf * (1 - w) + hf * w : hf;
    }
    const holdW = opts.reduce ? 1 : smooth(HOLD_RADIUS, HOLD_RADIUS * 0.25, dh);
    // the slider drift applies to the still only; it eases away as the camera leaves the scene
    const zoom = 1 + 0.03 * (driftNow + 0.5) * holdW, panX = -driftNow * 0.012 * holdW;
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const paint = (bmp: ImageBitmap | null | undefined, alpha: number, z = 1, px = 0) => {
      if (!bmp || alpha <= 0.002) return false;
      const t = cover(bmp.width, bmp.height, z, px);
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(bmp, t.dx, t.dy, bmp.width * t.s, bmp.height * t.s);
      return true;
    };
    let base = false;
    if (!opts.reduce && holdW < 1) {
      const { i0, i1, a } = seqIndexAt(uNow);
      base = paint(nearestSeq(i0), 1);
      if (base && seqBitmaps.has(i1)) paint(seqBitmaps.get(i1), a);
    }
    const hk = holdBitmaps.get(k);
    if (!base) {
      // motion frames not decoded yet (or reduced motion): dissolve between the two nearest stills
      const k0 = Math.floor(uNow), k1 = Math.min(4, k0 + 1), f = smooth(0.35, 0.65, uNow - k0);
      const b0 = holdBitmaps.get(k0), b1 = holdBitmaps.get(k1);
      if (b0) paint(b0, 1, f < 0.5 ? zoom : 1, f < 0.5 ? panX : 0); else if (b1) paint(b1, 1);
      if (b0 && b1) paint(b1, f);
    } else if (hk) paint(hk, holdW, zoom, panX);
    ctx.globalAlpha = 1;

    // labels: interpolate the projected anchors, map through the same cover transform
    const out: LabelOut[] = [];
    const { i0, i1, a } = seqIndexAt(uNow);
    const L0 = m.seq.frames[i0]?.labels ?? {}, L1 = m.seq.frames[i1]?.labels ?? {};
    const LH = m.holds.find((h) => h.u === k)?.labels ?? {};
    const ids = new Set([...Object.keys(L0), ...Object.keys(L1), ...Object.keys(LH)]);
    const t = cover(m.w, m.h, zoom, panX);
    const dpr = cw / Math.max(1, host.clientWidth);
    // every known label is reported each time, so labels of other scenes are explicitly hidden
    for (const id of labelIds) if (!ids.has(id)) out.push({ id, x: -999, y: -999, opacity: 0 });
    for (const id of ids) {
      const sc = labelScene(id);
      const vis = sc < 0 ? 0 : smooth(0.22, 0.06, Math.abs(uNow - sc));
      if (vis <= 0) { out.push({ id, x: -999, y: -999, opacity: 0 }); continue; }
      let p: [number, number] | undefined;
      if (holdW > 0.5 && LH[id]) p = LH[id];
      else if (L0[id] && L1[id]) p = [L0[id][0] + (L1[id][0] - L0[id][0]) * a, L0[id][1] + (L1[id][1] - L0[id][1]) * a];
      else p = L0[id] ?? L1[id];
      if (!p) continue;
      const x = (t.dx + p[0] * m.w * t.s) / dpr, y = (t.dy + p[1] * m.h * t.s) / dpr;
      const inside = x > 8 && x < host.clientWidth - 8 && y > 40 && y < host.clientHeight - 8;
      out.push({ id, x, y, opacity: inside ? vis : 0 });
    }
    out.sort((p, q) => q.opacity - p.opacity);
    cb.onLabels(out);
  };

  // ---------- loop: draws only when something changed
  let raf = 0, last = performance.now();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (manual || document.hidden) return;
    const k = 1 - Math.exp(-dt * 9);
    const du = uTarget - uNow, dd = drift - driftNow;
    if (Math.abs(du) > 1e-4 || Math.abs(dd) > 1e-4) {
      uNow = Math.abs(du) < 1e-4 ? uTarget : uNow + du * k;
      driftNow = Math.abs(dd) < 1e-4 ? drift : driftNow + dd * k;
      dirty = true; manageWindow();
    }
    if (dirty) { dirty = false; draw(); }
  };
  raf = requestAnimationFrame(frame);

  if (QA) {
    const qa = {
      ready: () => !!manifest && holdBitmaps.size === manifest.holds.length,
      seqReady: () => !!manifest && seqBlobs.size === manifest.seq.frames.length,
      manual(on: boolean) { manual = on; },
      setU(u: number) { uTarget = u; },
      /** jump the playhead to the target, decode what it needs, then draw */
      async settle(u?: number) {
        if (u != null) uTarget = u;
        uNow = uTarget; driftNow = drift; manageWindow();
        for (let i = 0; i < 100 && decoding.size; i++) await new Promise((r) => setTimeout(r, 30));
        draw(); return qa.state();
      },
      advance() { uNow = uTarget; driftNow = drift; manageWindow(); draw(); return qa.state(); },
      state: () => ({ u: uNow, lid: 0, holds: holdBitmaps.size, frames: seqBlobs.size, decoded: seqBitmaps.size }),
      teardown: () => { api.dispose(); return { canvases: host.querySelectorAll("canvas").length }; },
    };
    (window as unknown as { __qa: unknown }).__qa = qa;
  }
  void cb.onHover; void cb.onSelect;

  const api = {
    setProgress(u: number, d: number) {
      uTarget = opts.reduce ? Math.round(u) : Math.min(4, Math.max(0, u));
      drift = opts.reduce ? 0 : d;
    },
    dispose() {
      stopped = true; abort.abort();
      cancelAnimationFrame(raf); ro.disconnect();
      for (const b of holdBitmaps.values()) b.close();
      for (const b of seqBitmaps.values()) b.close();
      holdBitmaps.clear(); seqBitmaps.clear(); seqBlobs.clear();
      canvas.remove();
    },
  };
  return api;
}
