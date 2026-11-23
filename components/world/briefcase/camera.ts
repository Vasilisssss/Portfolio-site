/**
 * Camera choreography. Keyframes are photographic: a look-at target, a distance, an orbit (azimuth / elevation),
 * a lens (vertical fov) and a lens shift (composition without changing perspective, like a shift lens).
 * Channels are interpolated with monotone cubics (no overshoot → the camera never swings past a keyframe
 * into geometry). On narrower screens the lens widens, then the camera steps back, so the framing is preserved.
 */
export interface Key { u: number; t: [number, number, number]; dist: number; az: number; el: number; fov: number; sx: number; sy: number; syPortrait: number }


export const KEYS: Key[] = [
  { u: 0.0,  t: [0, 0.056, 0],          dist: 1.16, az: 26,  el: 17, fov: 27, sx: -0.3,  sy: 0.02, syPortrait: -0.22 },  // I    hero: the case in the studio
  { u: 0.1,  t: [0.07, 0.06, 0.1],      dist: 0.56, az: 28,  el: 13, fov: 27, sx: -0.12, sy: 0,    syPortrait: 0 },      //      approach
  { u: 0.2,  t: [0.128, 0.064, 0.18],   dist: 0.2,  az: 30,  el: 9,  fov: 26, sx: 0,     sy: 0,    syPortrait: 0.1 },    //      macro: the right-hand lock releases
  { u: 0.42, t: [0, 0.11, -0.01],       dist: 0.8,  az: -24, el: 21, fov: 27, sx: 0,     sy: 0,    syPortrait: 0.05 },   //      three-quarter: the lid lifts
  { u: 0.66, t: [0, 0.1, 0.0],          dist: 0.6,  az: -12, el: 38, fov: 28, sx: 0,     sy: 0,    syPortrait: 0 },      //      the exchange rises out of the case
  { u: 0.8,  t: [0, 0.12, 0.006],       dist: 0.42, az: -6,  el: 56, fov: 30, sx: 0,     sy: 0,    syPortrait: 0 },      //      above the model: the descent begins
  { u: 4.0,  t: [0, 0.11, -0.03],       dist: 1.34, az: -34, el: 23, fov: 27, sx: -0.24, sy: -0.16, syPortrait: -0.24 }, // V    final reveal
];

/** Fritsch–Carlson monotone cubic through (xs, ys) evaluated at x */
export function monotone(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0; while (x > xs[i + 1]) i++;
  const d = (k: number) => (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
  const tan = (k: number) => {
    if (k === 0) return d(0);
    if (k === n - 1) return d(n - 2);
    const a = d(k - 1), b = d(k);
    if (a * b <= 0) return 0;
    const w1 = 2 * (xs[k + 1] - xs[k]) + (xs[k] - xs[k - 1]), w2 = (xs[k + 1] - xs[k]) + 2 * (xs[k] - xs[k - 1]);
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
  return h00 * ys[i] + h10 * h * tan(i) + h01 * ys[i + 1] + h11 * h * tan(i + 1);
}

export interface Rig { target: [number, number, number]; pos: [number, number, number]; fov: number; sx: number; sy: number; dist: number }

const REF_ASPECT = 1.6;
const xs = KEYS.map((k) => k.u);
const ch = (f: (k: Key) => number) => KEYS.map(f);
const CH = {
  tx: ch((k) => k.t[0]), ty: ch((k) => k.t[1]), tz: ch((k) => k.t[2]), dist: ch((k) => k.dist),
  az: ch((k) => k.az), el: ch((k) => k.el), fov: ch((k) => k.fov), sx: ch((k) => k.sx), sy: ch((k) => k.sy), syp: ch((k) => k.syPortrait),
};

/**
 * @param u journey position 0..4
 * @param aspect viewport width / height
 * @param orbit extra azimuth in degrees (reading drift, pointer)
 * @param dolly distance multiplier (intro approach)
 */
export function sampleRig(u: number, aspect: number, orbit = 0, dolly = 1, lift = 0): Rig {
  const v = (c: number[]) => monotone(xs, c, u);
  let fov = v(CH.fov), dist = v(CH.dist) * dolly;
  // keep the horizontal framing of a 16:10 frame on narrower screens: widen the lens first, then step back
  if (aspect < REF_ASPECT) {
    const want = Math.tan((fov * Math.PI) / 360) * (REF_ASPECT / aspect);
    const fov2 = Math.min(46, (Math.atan(want) * 360) / Math.PI);
    dist *= want / Math.tan((fov2 * Math.PI) / 360);
    fov = fov2;
  }
  const az = ((v(CH.az) + orbit) * Math.PI) / 180, el = ((v(CH.el) + lift) * Math.PI) / 180;
  const t: [number, number, number] = [v(CH.tx), v(CH.ty), v(CH.tz)];
  const pos: [number, number, number] = [t[0] + Math.sin(az) * Math.cos(el) * dist, t[1] + Math.sin(el) * dist, t[2] + Math.cos(az) * Math.cos(el) * dist];
  // composition: landscape uses the side shift (text on the left); portrait shifts the subject down under the copy
  const k = Math.min(1, Math.max(0, (aspect - 0.9) / 0.7));
  return { target: t, pos, fov, sx: v(CH.sx) * k, sy: v(CH.sy) * k + v(CH.syp) * (1 - k), dist };
}
