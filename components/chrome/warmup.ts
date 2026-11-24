/**
 * Warm-up handshake between the opening curtain (Loader) and whatever needs to be ready before the first scroll
 * (the journey's walk frames). A page that has something to warm reports progress here; the curtain stays up until it
 * reports done (within the curtain's own minimum and cap), and its counter follows the real progress.
 * A page that reports nothing (no journey, reduced motion) gets the curtain's normal timing.
 */
type Warm = { p: number; done: boolean };
declare global { interface Window { __warm?: Warm } }

export const WARM_EVENT = "warm:progress";

export function reportWarm(p: number, done = false) {
  const w = (window.__warm ??= { p: 0, done: false });
  w.p = Math.max(w.p, Math.min(1, p));
  if (done) { w.done = true; w.p = 1; }
  window.dispatchEvent(new Event(WARM_EVENT));
}

export const warmState = (): Warm | undefined => window.__warm;
