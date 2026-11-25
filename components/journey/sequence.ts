/**
 * Frame sequence loader for scroll-scrubbed footage (the headquarters walk).
 *
 * Generalised from the old film player: frames are small WebP files listed by a manifest. Frames nearest the
 * playhead are requested first, six at a time; every compressed frame is kept as a Blob, and only a window of
 * frames around the playhead is decoded into ImageBitmaps (bitmaps leaving the window are closed). The window leans
 * the way the playhead is moving (AHEAD frames in front, BEHIND behind), so a fast scroll finds its frames decoded. The renderer
 * asks for the pair of decoded frames around a fractional playhead and cross-fades them.
 */
export interface WalkManifest {
  w: number; h: number; lo: { w: number; h: number };
  fps: number; frames: number; step: number;
  hi: string; loPath: string; poster: string; posterSm: string; last: string;
  join: number; doors: number;
}

const AHEAD = 20, BEHIND = 6, KEEP = AHEAD + 4;

export interface Sequence {
  readonly manifest: WalkManifest;
  /** decoded frames around a fractional index (nearest decoded neighbours if the exact ones are not ready) */
  pair(f: number): { a: ImageBitmap | null; b: ImageBitmap | null; t: number; ia: number; ib: number };
  /** move the playhead: re-prioritises loading and the decoded window */
  seek(f: number): void;
  readonly loaded: number;
  readonly decoded: number;
  onChange(cb: () => void): void;
  ready(): boolean;
  dispose(): void;
}

export async function loadSequence(base: string, low: boolean, signal: AbortSignal): Promise<Sequence> {
  const r = await fetch(`${base}/manifest.json`, { signal });
  if (!r.ok) throw new Error(`walk manifest ${r.status}`);
  const m = (await r.json()) as WalkManifest;
  const url = (i: number) => `${base}/${(low ? m.loPath : m.hi).replace("{i}", String(i).padStart(4, "0"))}`;
  const blobs = new Map<number, Blob>();
  const bitmaps = new Map<number, ImageBitmap>();
  const decoding = new Set<number>();
  const listeners: (() => void)[] = [];
  let head = 0, dir = 1, stopped = false;
  const changed = () => listeners.forEach((f) => f());

  const decode = (i: number) => {
    if (i < 0 || i >= m.frames || bitmaps.has(i) || decoding.has(i)) return;
    const b = blobs.get(i);
    if (!b) return;
    decoding.add(i);
    createImageBitmap(b).then((bmp) => {
      decoding.delete(i);
      if (stopped || Math.abs(i - head) > KEEP) { bmp.close(); return; }
      bitmaps.set(i, bmp); changed();
    }, () => decoding.delete(i));
  };
  const manage = () => {
    const c = Math.round(head);
    // nearest first, alternating, until the short side is covered; then the rest of the side being walked towards
    for (let d = 0; d <= AHEAD; d++) { decode(c + dir * d); if (d && d <= BEHIND) decode(c - dir * d); }
    for (const [i, bmp] of bitmaps) { const ahead = (i - c) * dir; if (ahead > KEEP || ahead < -(BEHIND + 4)) { bmp.close(); bitmaps.delete(i); } }
  };

  // fetch: nearest the playhead first, six requests in flight
  const pending = new Set(Array.from({ length: m.frames }, (_, i) => i));
  const next = () => {
    if (!pending.size) return -1;
    let best = -1, bd = Infinity;
    for (const i of pending) { const d = Math.abs(i - head); if (d < bd) { bd = d; best = i; } }
    pending.delete(best); return best;
  };
  const worker = async () => {
    for (let i = next(); i >= 0 && !stopped; i = next()) {
      try {
        const res = await fetch(url(i), { signal });
        if (!res.ok) throw new Error(String(res.status));
        blobs.set(i, await res.blob());
        const ahead = (i - head) * dir;
        if (ahead <= AHEAD && ahead >= -BEHIND) decode(i);
      } catch (e) { if (stopped || signal.aborted) return; console.warn("walk frame", i, e); }
    }
  };
  void Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);

  const nearest = (i: number, dir: number) => {
    for (let d = 0; d < 8; d++) { const k = i + dir * d; const b = bitmaps.get(k); if (b) return { b, k }; }
    for (let d = 1; d < 8; d++) { const k = i - dir * d; const b = bitmaps.get(k); if (b) return { b, k }; }
    return { b: null, k: i };
  };

  return {
    manifest: m,
    pair(f) {
      const i0 = Math.max(0, Math.min(m.frames - 1, Math.floor(f))), i1 = Math.min(m.frames - 1, i0 + 1);
      const A = nearest(i0, -1), B = nearest(i1, 1);
      const t = B.k === A.k ? 0 : Math.max(0, Math.min(1, (f - A.k) / (B.k - A.k)));
      return { a: A.b, b: B.b, t, ia: A.k, ib: B.k };
    },
    seek(f) {
      const h = Math.max(0, Math.min(m.frames - 1, f));
      if (Math.abs(h - head) > 0.01) dir = h > head ? 1 : -1;
      head = h; manage();
    },
    get loaded() { return blobs.size; },
    get decoded() { return bitmaps.size; },
    onChange(cb) { listeners.push(cb); },
    ready: () => bitmaps.has(Math.round(head)),
    dispose() { stopped = true; for (const b of bitmaps.values()) b.close(); bitmaps.clear(); blobs.clear(); },
  };
}
