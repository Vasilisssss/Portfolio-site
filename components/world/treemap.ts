/**
 * Squarified treemap (Bruls, Huizing & van Wijk). Each holding gets a plot whose AREA is exactly proportional
 * to its weight, with plots kept as close to square as possible. Order of the output matches the input.
 */
export interface Rect { x: number; y: number; w: number; h: number }

export function squarify(values: number[], rect: Rect): Rect[] {
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  const out: Rect[] = values.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));
  if (!values.length || total <= 0) return out;
  const scale = (rect.w * rect.h) / total;
  const items = values.map((v, i) => ({ i, a: Math.max(0, v) * scale })).filter((x) => x.a > 0).sort((p, q) => q.a - p.a);
  let free = { ...rect };
  let row: typeof items = [];
  const worst = (r: typeof items, side: number) => {
    const s = r.reduce((t, x) => t + x.a, 0); if (!s) return Infinity;
    const mx = Math.max(...r.map((x) => x.a)), mn = Math.min(...r.map((x) => x.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const layout = (r: typeof items) => {
    const s = r.reduce((t, x) => t + x.a, 0);
    if (free.w >= free.h) { // lay the row as a column on the left
      const cw = s / free.h; let y = free.y;
      for (const x of r) { const h = x.a / cw; out[x.i] = { x: free.x, y, w: cw, h }; y += h; }
      free = { x: free.x + cw, y: free.y, w: free.w - cw, h: free.h };
    } else { // lay the row along the top
      const rh = s / free.w; let x0 = free.x;
      for (const x of r) { const w = x.a / rh; out[x.i] = { x: x0, y: free.y, w, h: rh }; x0 += w; }
      free = { x: free.x, y: free.y + rh, w: free.w, h: free.h - rh };
    }
  };
  for (const it of items) {
    const side = Math.min(free.w, free.h);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it);
    else { layout(row); row = [it]; }
  }
  if (row.length) layout(row);
  return out;
}
