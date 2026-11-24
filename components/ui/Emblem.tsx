/**
 * EMBLEM: a position card's artwork, in the manner of the hand-made Anthropic burst. Each emblem is generated
 * from a seed (the ticker), so a position always gets the same one and different positions differ. Seven families,
 * each with its own proportions: burst, rings, orbit, petals, facets, dots, waves. Drawn in the accent colour.
 * `art` (from data/holdings.json) picks the family; otherwise the seed does.
 */
export const EMBLEMS = ["burst", "rings", "orbit", "petals", "facets", "dots", "waves"] as const;
export type EmblemKind = (typeof EMBLEMS)[number];

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const f = (n: number) => +n.toFixed(2);
const polar = (deg: number, rad: number): [number, number] => [f(50 + rad * Math.cos((deg * Math.PI) / 180)), f(50 + rad * Math.sin((deg * Math.PI) / 180))];

export default function Emblem({ seed, color, art, className }: { seed: string; color: string; art?: string; className?: string }) {
  const r = rng(seed.toUpperCase());
  const kind: EmblemKind = (EMBLEMS as readonly string[]).includes(art ?? "") ? (art as EmblemKind) : EMBLEMS[int(r, 0, EMBLEMS.length - 1)];
  const tilt = int(r, 0, 359);
  let body: React.ReactNode;

  switch (kind) {
    case "burst": {
      // tapered rays of two lengths around a core (the Anthropic manner)
      const n = int(r, 10, 22), long = 40 + r() * 4, short = long * (0.55 + r() * 0.25), w = 2.6 + r() * 2.2;
      body = (<>
        {Array.from({ length: n }, (_, i) => {
          const L = i % 2 ? short : long;
          return <path key={i} d={`M50 ${f(50 - L)} L${f(50 + w)} ${f(50 - L * 0.22)} L50 50 L${f(50 - w)} ${f(50 - L * 0.22)} Z`} fill={color} opacity={i % 2 ? 0.7 : 1} transform={`rotate(${f((360 / n) * i + tilt)} 50 50)`} />;
        })}
        <circle cx="50" cy="50" r={f(4 + r() * 3)} fill={color} />
      </>);
      break;
    }
    case "rings": {
      // concentric rings, each broken by a gap at its own angle
      const n = int(r, 4, 7);
      body = (<>
        {Array.from({ length: n }, (_, i) => {
          const rad = 8 + (i * 36) / (n - 1), gap = 25 + r() * 70, start = r() * 360;
          const [x1, y1] = polar(start, rad), [x2, y2] = polar(start + 360 - gap, rad);
          return <path key={i} d={`M${x1} ${y1} A${f(rad)} ${f(rad)} 0 1 1 ${x2} ${y2}`} stroke={color} strokeWidth={f(1.2 + (i === n - 1 ? 0.8 : 0))} strokeLinecap="round" opacity={f(0.45 + (0.55 * (i + 1)) / n)} />;
        })}
        <circle cx="50" cy="50" r="3.2" fill={color} />
      </>);
      break;
    }
    case "orbit": {
      // crossed ellipses, an atom-like figure
      const n = int(r, 3, 6), ry = 10 + r() * 10;
      body = (<>
        {Array.from({ length: n }, (_, i) => <ellipse key={i} cx="50" cy="50" rx="44" ry={f(ry)} stroke={color} strokeWidth="1.3" opacity="0.85" transform={`rotate(${f((180 / n) * i + tilt)} 50 50)`} />)}
        {Array.from({ length: n }, (_, i) => { const [x, y] = polar((180 / n) * i + tilt, 44); return <circle key={`d${i}`} cx={x} cy={y} r="2.4" fill={color} />; })}
        <circle cx="50" cy="50" r="5" fill={color} />
      </>);
      break;
    }
    case "petals": {
      // overlapping leaves around the centre
      const n = int(r, 6, 12), len = 20 + r() * 6, wid = 5 + r() * 5;
      body = (<>
        {Array.from({ length: n }, (_, i) => <ellipse key={i} cx="50" cy={f(50 - len)} rx={f(wid)} ry={f(len)} fill={color} opacity={f(0.35 + 0.4 * (i % 2))} transform={`rotate(${f((360 / n) * i + tilt)} 50 50)`} />)}
        <circle cx="50" cy="50" r={f(5 + r() * 3)} fill={color} />
      </>);
      break;
    }
    case "facets": {
      // nested polygons turning inwards
      const sides = int(r, 5, 9), levels = int(r, 3, 5), turn = 8 + r() * 22;
      body = (<>
        {Array.from({ length: levels }, (_, l) => {
          const rad = 44 - l * (36 / levels);
          const pts = Array.from({ length: sides }, (_, k) => polar((360 / sides) * k + tilt + l * turn, rad).join(",")).join(" ");
          return <polygon key={l} points={pts} stroke={color} strokeWidth={f(1.6 - l * 0.2)} strokeLinejoin="round" fill={l === levels - 1 ? color : "none"} fillOpacity="0.25" opacity={f(1 - l * 0.12)} />;
        })}
        {Array.from({ length: sides }, (_, k) => { const [x, y] = polar((360 / sides) * k + tilt, 44); return <line key={`s${k}`} x1="50" y1="50" x2={x} y2={y} stroke={color} strokeWidth="0.6" opacity="0.4" />; })}
      </>);
      break;
    }
    case "dots": {
      // a field of dots swelling towards the centre, on a spiral
      const n = int(r, 70, 120), golden = 137.508, scale = 4.1 + r() * 0.4;
      body = (<>
        {Array.from({ length: n }, (_, i) => {
          const rad = scale * Math.sqrt(i + 1); if (rad > 45) return null;
          const [x, y] = polar(i * golden + tilt, rad);
          return <circle key={i} cx={x} cy={y} r={f(2.6 - (rad / 45) * 1.9)} fill={color} opacity={f(1 - (rad / 45) * 0.55)} />;
        })}
      </>);
      break;
    }
    default: {
      // waves: parallel sine lines inside a circle
      const n = int(r, 6, 10), amp = 3 + r() * 5, k = 1.5 + r() * 1.5;
      body = (<>
        <defs><clipPath id={`wc-${seed}`}><circle cx="50" cy="50" r="44" /></clipPath></defs>
        <g clipPath={`url(#wc-${seed})`} transform={`rotate(${tilt % 180} 50 50)`}>
          {Array.from({ length: n }, (_, i) => {
            const y0 = 8 + (i * 84) / (n - 1);
            const d = Array.from({ length: 25 }, (_, s) => { const x = s * (100 / 24); return `${s ? "L" : "M"}${f(x)} ${f(y0 + amp * Math.sin((x / 100) * k * 2 * Math.PI + i * 0.6))}`; }).join(" ");
            return <path key={i} d={d} stroke={color} strokeWidth="1.4" opacity={f(0.5 + 0.5 * Math.sin((i / (n - 1)) * Math.PI))} />;
          })}
        </g>
        <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="0.8" opacity="0.5" />
      </>);
    }
  }
  return <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">{body}</svg>;
}
