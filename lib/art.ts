export type ArtKind = "eq" | "pe" | "re" | "vc" | "alt" | "sh" | "fi" | "cash";
import { mulberry32 } from "./random";

/** Procedural line-art compositions (viewBox 0 0 400 300). `a` = ivory hairlines, `b` = gold accent. */
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const f = (n: number) => n.toFixed(1);

export function makeArt(kind: ArtKind | "feature", seed = 1): { a: string; b: string } {
  const r = mulberry32(seed * 977 + kind.length * 13);
  let a = "", b = "";
  switch (kind) {
    case "eq": {
      // neutral price columns — decorative, deliberately no up or down trend
      for (let i = 0; i < 36; i++) {
        const x = 30 + i * 9.6, h = 70 + Math.sin(i * 0.55) * 26 + r() * 40;
        a += `M${f(x)} ${f(200 - h / 2)}V${f(200 + h / 2)}`;
      }
      b = "M20 200H380" + circ(200, 200, 30);
      break;
    }
    case "pe": {
      for (let k = 0; k < 9; k++) {
        const w = 240 - k * 24, h = w * 0.62, x = 200 - w / 2 + k * 7, y = 160 - h / 2 - k * 5;
        a += `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
      }
      const w = 144, h = w * 0.62, x = 200 - w / 2 + 28, y = 160 - h / 2 - 20;
      b = `M${f(x)} ${f(y)}h${w}v${f(h)}h${-w}ZM80 85.6L${f(x)} ${f(y)}M320 234.4L${f(x + w)} ${f(y + h)}`;
      break;
    }
    case "re": {
      for (const [x0, w, top] of [[50, 80, 90], [150, 100, 30], [270, 80, 120]]) {
        a += `M${x0} 270V${top}H${x0 + w}V270`;
        for (let y = top + 14; y < 266; y += 14) a += `M${x0} ${y}H${x0 + w}`;
        for (let x = x0 + 16; x < x0 + w; x += 16) a += `M${x} ${top}V270`;
      }
      b = "M20 270H380M150 270V30H250V270M200 30V8";
      break;
    }
    case "vc": {
      const pts = Array.from({ length: 24 }, () => [30 + r() * 340, 30 + r() * 240] as [number, number]).sort((p, q) => p[0] - q[0]);
      pts.forEach((p, i) => {
        for (const o of [1, 3]) { const q = pts[i + o]; if (q) a += `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`; }
        a += circ(+f(p[0]), +f(p[1]), 2);
      });
      const hub = pts[15];
      b = circ(+f(hub[0]), +f(hub[1]), 34) + circ(+f(hub[0]), +f(hub[1]), 6);
      for (const j of [3, 8, 20]) b += `M${f(hub[0])} ${f(hub[1])}L${f(pts[j][0])} ${f(pts[j][1])}`;
      break;
    }
    case "alt": {
      const ingot = (ox: number, oy: number) =>
        `M${ox} ${oy}L${ox + 120} ${oy}L${ox + 105} ${oy - 30}L${ox + 15} ${oy - 30}Z` +
        `M${ox + 15} ${oy - 30}L${ox + 35} ${oy - 45}L${ox + 125} ${oy - 45}L${ox + 105} ${oy - 30}` +
        `M${ox + 120} ${oy}L${ox + 140} ${oy - 15}L${ox + 125} ${oy - 45}`;
      a = ingot(60, 240) + ingot(200, 240) + "M20 240H380";
      for (let i = 0; i < 9; i++) a += `M${40 + i * 40} 60L${60 + i * 40} 40`;
      b = ingot(130, 195);
      break;
    }
    case "sh": {
      for (let k = 1; k <= 6; k++) a += circ(200, 150, k * 22);
      a += "M200 10V290M60 150H340";
      const at = (d: number) => [200 + 110 * Math.cos((d * Math.PI) / 180), 150 + 110 * Math.sin((d * Math.PI) / 180)];
      const [x0, y0] = at(-90), [x1, y1] = at(150);
      b = `M${f(x0)} ${f(y0)}A110 110 0 1 1 ${f(x1)} ${f(y1)}` + circ(+f(x1), +f(y1), 5);
      break;
    }
    case "fi": {
      const yAt = (x: number, k: number) => 250 - k * 16 - 100 * (1 - Math.exp(-(x - 30) / 70)) * (1 - k * 0.07);
      for (let k = 0; k < 8; k++) {
        let d = "";
        for (let x = 30; x <= 370; x += 10) d += `${x === 30 ? "M" : "L"}${x} ${f(yAt(x, k))}`;
        if (k === 3) b = d; else a += d;
      }
      a += "M30 270H370";
      for (const x of [30, 70, 130, 210, 370]) b += circ(x, +f(yAt(x, 3)), 3);
      break;
    }
    case "cash": {
      for (let k = 0; k < 11; k++) { const y = 70 + k * 16, w = 260 - Math.abs(k - 5) * 18; a += `M${f(200 - w / 2)} ${y}H${f(200 + w / 2)}`; }
      b = "M70 150H330" + circ(200, 150, 26);
      break;
    }
    default: {
      for (let k = 0; k < 14; k++) {
        let d = "";
        for (let x = 0; x <= 600; x += 12) d += `${x ? "L" : "M"}${x} ${f(60 + k * 18 + Math.sin(x / 70 + k * 0.5) * (20 + k * 2) + Math.sin(x / 23) * 3)}`;
        if (k === 7) b = d; else a += d;
      }
      a += "M0 330H600";
    }
  }
  return { a, b };
}
