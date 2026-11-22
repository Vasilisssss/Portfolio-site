/**
 * Chart geometry helpers. Pure functions, no data changes: they only decide how real values are drawn.
 */

export type Pt = [number, number];

/**
 * Monotone cubic (Fritsch–Carlson) path through every point. The curve passes exactly through each
 * month-end value and never overshoots between them, so smoothing can't invent highs or lows.
 */
export function monotonePath(pts: Pt[]): string {
  const n = pts.length;
  if (!n) return "";
  const f = (v: number) => v.toFixed(2);
  if (n < 3) return pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join("");
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; m[i] = dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0; }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else { const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1]; t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]); }
  }
  t[n - 1] = m[n - 2];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${f(pts[i][0] + h)} ${f(pts[i][1] + t[i] * h)} ${f(pts[i + 1][0] - h)} ${f(pts[i + 1][1] - t[i + 1] * h)} ${f(pts[i + 1][0])} ${f(pts[i + 1][1])}`;
  }
  return d;
}

export const linearPath = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("");

/** Round axis ticks (1 / 2 / 2.5 / 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): { lo: number; hi: number; ticks: number[]; step: number } {
  if (!(max > min)) { const p = Math.abs(min) * 0.1 || 1; min -= p; max += p; }
  const raw = (max - min) / count, mag = 10 ** Math.floor(Math.log10(raw)), r = raw / mag;
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, ticks, step };
}

/** Evenly spaced indices for x-axis labels, always including the first and last point. */
export function tickIndices(n: number, maxTicks: number): number[] {
  if (n <= 1) return [0];
  const k = Math.max(2, Math.min(n, maxTicks));
  return [...new Set(Array.from({ length: k }, (_, i) => Math.round((i / (k - 1)) * (n - 1))))];
}
