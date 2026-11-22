/**
 * Adaptive quality for the 3D world. Resolution is the last thing to give:
 *   level 0 everything on · 1 mirror floor off · 2 half-res glow · 3 lighter anti-aliasing · 4 glow off
 *   level 5+ resolution steps of 0.25×, never below max(1×, 75% of the screen's native density)
 * Decisions use the median frame time of ~1 s windows, so load hitches and scroll stalls don't count.
 * When the device runs smoothly again, effects come back one level at a time.
 */
export const EFFECT_LEVELS = 4;

export const minDpr = (native: number) => Math.min(native, Math.max(1, native * 0.75));
export const maxLevel = (native: number) => EFFECT_LEVELS + Math.round((native - minDpr(native)) / 0.25);
export const dprFor = (native: number, level: number) => Math.max(minDpr(native), native - Math.max(0, level - EFFECT_LEVELS) * 0.25);

export function createGovernor(opts: { native: number; warmupMs?: number; onChange: (level: number) => void }) {
  let native = opts.native, level = 0, fast = 0, upTo = -1, upAt = 0, startAt = -Infinity, lastT = -1;
  const warmup = opts.warmupMs ?? 2500;
  const times: number[] = [];
  let span = 0;
  const failed = new Map<number, number>(); // levels whose upgrade failed right away: stop retrying after two attempts
  const set = (l: number) => { level = l; opts.onChange(level); };
  return {
    get level() { return level; },
    start(now: number) { startAt = now; lastT = now; times.length = 0; span = 0; },
    pause(now: number) { lastT = now; },
    setNative(n: number) { native = n; failed.clear(); fast = 0; times.length = 0; span = 0; set(0); },
    sample(now: number) {
      const dt = now - lastT; lastT = now;
      if (now - startAt < warmup || dt > 1000) return; // warm-up, or a stall (tab switch, long task)
      times.push(dt); span += dt;
      if (times.length < 60 && !(span >= 2000 && times.length >= 6)) return;
      times.sort((x, y) => x - y);
      const med = times[times.length >> 1];
      times.length = 0; span = 0;
      if (med > 24 && level < maxLevel(native)) {
        if (level === upTo && now - upAt < 4000) failed.set(upTo, (failed.get(upTo) ?? 0) + 1);
        fast = 0; set(level + 1);
      } else if (med < 18.5 && level > 0) {
        if (++fast >= 4 && (failed.get(level - 1) ?? 0) < 2) { fast = 0; upTo = level - 1; upAt = now; set(level - 1); }
      } else fast = 0;
    },
  };
}
