/**
 * Physical choreography of the case, driven by scroll position u (0 → 1 is the reveal).
 *
 * Every part is a damped spring with its own mass, and each stage is gated on the *actual* state of the
 * previous one, in both directions:
 *   slider releases → flap springs open → lid lifts (hinge stop at 100°, small bounce) → platform rises → towers extend → bearings roll
 * Closing runs the same chain backwards (towers retract before the platform lowers, the lid can only close
 * once the platform is down, and the flap only re-latches once the lid has landed).
 */
/** hinge stop — must equal dims.LID_MAX (kept dependency-free so the mechanics can be unit-tested on their own) */
export const LID_MAX = (100 * Math.PI) / 180;

export interface MechState {
  slider: number; flap: number; lid: number; platform: number; towers: number; flow: number;
}
interface Spring { x: number; v: number; k: number; z: number }

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ramp = (u: number, a: number, b: number) => clamp01((u - a) / (b - a));
/** slow-in / slow-out so a scrub never starts or stops a heavy part abruptly */
const smooth = (t: number) => t * t * (3 - 2 * t);

export function wanted(u: number) {
  return {
    unlock: u >= 0.12,
    lid: smooth(ramp(u, 0.2, 0.5)) * LID_MAX,
    platform: smooth(ramp(u, 0.5, 0.62)),
    towers: smooth(ramp(u, 0.58, 0.76)),
  };
}

export function createMechanics() {
  const s: Record<keyof Omit<MechState, "flow">, Spring> = {
    slider: { x: 0, v: 0, k: 320, z: 0.95 },
    flap: { x: 0, v: 0, k: 260, z: 0.55 },     // spring-loaded: snaps open with a little overshoot
    lid: { x: 0, v: 0, k: 26, z: 0.78 },       // heavy: slower, slight settle at the stop
    platform: { x: 0, v: 0, k: 60, z: 1 },
    towers: { x: 0, v: 0, k: 45, z: 1 },
  };
  let flow = 0;

  const targets = (u: number) => {
    const w = wanted(u);
    // the lid counts as open until it has landed and stopped moving (no re-latching on the bounce)
    const lidOpen = s.lid.x > 0.0005 || Math.abs(s.lid.v) > 0.02;
    const sliderT = w.unlock || lidOpen || s.flap.x > 0.04 ? 1 : 0;
    const flapT = (w.unlock || lidOpen) && s.slider.x > 0.92 ? 1 : 0;
    let lidT = s.flap.x > 0.95 ? w.lid : 0;
    if (s.platform.x > 0.01 || s.towers.x > 0.01) lidT = LID_MAX; // can't close on a raised model
    let platT = s.lid.x > LID_MAX * 0.93 ? w.platform : 0;
    if (s.towers.x > 0.01) platT = 1;                                // towers must retract first
    const towT = s.platform.x > 0.95 ? w.towers : 0;
    return { slider: sliderT, flap: flapT, lid: lidT, platform: platT, towers: towT };
  };

  const stepSpring = (sp: Spring, target: number, dt: number) => {
    const c = 2 * Math.sqrt(sp.k) * sp.z;
    sp.v += (sp.k * (target - sp.x) - c * sp.v) * dt;
    sp.x += sp.v * dt;
  };

  return {
    /** advance by dt seconds (sub-stepped for stability at low frame rates) */
    update(u: number, dt: number, reduce: boolean) {
      if (reduce) {
        // no motion: resolve the gated chain instantly
        for (let i = 0; i < 8; i++) {
          const t = targets(u);
          (Object.keys(s) as (keyof typeof s)[]).forEach((k) => { s[k].x = t[k]; s[k].v = 0; });
        }
        flow = s.towers.x > 0.95 ? 1 : 0;
        return;
      }
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / n;
      for (let i = 0; i < n; i++) {
        const t = targets(u);
        (Object.keys(s) as (keyof typeof s)[]).forEach((k) => stepSpring(s[k], t[k], h));
        // hinge stop and seating: hard limits with a little energy returned
        if (s.lid.x > LID_MAX) { s.lid.x = LID_MAX; s.lid.v = -s.lid.v * 0.18; }
        if (s.lid.x < 0) { s.lid.x = 0; s.lid.v = -s.lid.v * 0.05; }
        for (const k of ["slider", "platform", "towers"] as const) { if (s[k].x < 0) { s[k].x = 0; s[k].v = 0; } if (s[k].x > 1) { s[k].x = 1; s[k].v = 0; } }
        if (s.flap.x < 0) { s.flap.x = 0; s.flap.v = -s.flap.v * 0.2; }
        flow += ((s.towers.x > 0.95 ? 1 : 0) - flow) * Math.min(1, h * 2.5);
      }
    },
    get state(): MechState {
      return { slider: s.slider.x, flap: s.flap.x, lid: s.lid.x, platform: s.platform.x, towers: s.towers.x, flow };
    },
    /** QA: true when nothing is moving any more */
    get settled() { return Object.values(s).every((sp) => Math.abs(sp.v) < 1e-3); },
  };
}
