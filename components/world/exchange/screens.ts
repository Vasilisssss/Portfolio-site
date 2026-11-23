import * as THREE from "three";

/**
 * Live displays inside the exchange, painted from the real portfolio data (the same privacy-filtered view the page uses).
 * Nothing is simulated: values are the snapshot as of the data date; what moves is the ticker band and the clock.
 */
export interface ScreenData {
  holdings: { id: string; label: string; name: string; weight: number; returnPct: number | null; assetClass: string; value?: string }[];
  history: { date: string; index: number }[];
  summary?: { value?: string; invested?: string; pnl?: string; pnlSign?: number; totalReturn?: string; twr?: string; asOf: string; currency: string };
}

const BG = "#07080a", INK = "#f3f2ed", MUTE = "#8c908f", LIME = "#d7ff3f", CORAL = "#ff7a66", LINE = "rgba(243,242,237,0.12)";
const SANS = "500 {s}px 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "500 {s}px ui-monospace, 'SFMono-Regular', Menlo, monospace";
const f = (tpl: string, s: number) => tpl.replace("{s}", String(Math.round(s)));
const pct = (v: number, signed = false) => `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}%`;
const tone = (r: number | null) => (r == null || Math.abs(r) < 0.0005 ? MUTE : r > 0 ? LIME : CORAL);

function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; paint(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { texture: t, canvas: c, g };
}

function indexChart(g: CanvasRenderingContext2D, d: ScreenData, x: number, y: number, w: number, h: number) {
  const pts = d.history; if (pts.length < 2) return;
  const vals = pts.map((p) => p.index), lo = Math.min(100, ...vals), hi = Math.max(100, ...vals), pad = (hi - lo) * 0.12 || 4;
  const Y = (v: number) => y + h - ((v - lo + pad) / (hi - lo + 2 * pad)) * h;
  const X = (i: number) => x + (i / (pts.length - 1)) * w;
  g.strokeStyle = LINE; g.lineWidth = 2; g.setLineDash([8, 10]); g.beginPath(); g.moveTo(x, Y(100)); g.lineTo(x + w, Y(100)); g.stroke(); g.setLineDash([]);
  g.font = f(MONO, h * 0.07); g.fillStyle = MUTE; g.fillText("100", x + w + 12, Y(100) + h * 0.025);
  const grad = g.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, "rgba(215,255,63,0.18)"); grad.addColorStop(1, "rgba(215,255,63,0)");
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p.index)) : g.moveTo(X(i), Y(p.index)))); g.lineTo(X(pts.length - 1), y + h); g.lineTo(x, y + h); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(i), Y(p.index)) : g.moveTo(X(i), Y(p.index)))); g.strokeStyle = LIME; g.lineWidth = Math.max(3, h * 0.012); g.lineJoin = "round"; g.stroke();
  const last = pts[pts.length - 1];
  g.fillStyle = LIME; g.beginPath(); g.arc(X(pts.length - 1), Y(last.index), h * 0.02, 0, Math.PI * 2); g.fill();
  g.font = f(MONO, h * 0.07); g.fillStyle = MUTE;
  g.fillText(pts[0].date.slice(0, 7), x, y + h + h * 0.11);
  const end = last.date.slice(0, 7); g.fillText(end, x + w - g.measureText(end).width, y + h + h * 0.11);
}

/** the 18 × 6.75 m board above the back mezzanine */
export function mainBoard(d: ScreenData) {
  return canvasTexture(2560, 960, (g, w, h) => {
    g.fillStyle = BG; g.fillRect(0, 0, w, h);
    const s = d.summary, m = 90;
    g.font = f(MONO, 30); g.fillStyle = LIME; g.fillText("PORTFOLIO", m, 110);
    g.fillStyle = MUTE; g.fillText(`AS OF ${s?.asOf ?? ""}`.toUpperCase(), m + 230, 110);
    // left: the headline figures
    g.font = f(SANS, 190); g.fillStyle = INK; g.fillText(s?.value ?? s?.totalReturn ?? "", m, 330);
    const rows: [string, string, string][] = [];
    if (s?.invested) rows.push(["INVESTED CAPITAL", s.invested, INK]);
    if (s?.pnl) rows.push(["PROFIT / LOSS", s.pnl, (s.pnlSign ?? 0) > 0 ? LIME : (s.pnlSign ?? 0) < 0 ? CORAL : INK]);
    if (s?.twr) rows.push(["TIME-WEIGHTED RETURN", s.twr, s.twr.startsWith("−") ? CORAL : LIME]);
    rows.forEach(([k, v, c], i) => { const y = 470 + i * 150; g.font = f(MONO, 28); g.fillStyle = MUTE; g.fillText(k, m, y); g.font = f(SANS, 84); g.fillStyle = c; g.fillText(v, m, y + 90); });
    g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.moveTo(1010, 80); g.lineTo(1010, h - 80); g.stroke();
    // centre: month-end index
    g.font = f(MONO, 28); g.fillStyle = MUTE; g.fillText("MONTH-END INDEX · REBASED TO 100", 1080, 150);
    indexChart(g, d, 1080, 210, 760, 560);
    // right: allocation by holding
    g.beginPath(); g.moveTo(1960, 80); g.lineTo(1960, h - 80); g.stroke();
    g.fillStyle = MUTE; g.fillText("ALLOCATION", 2020, 150);
    const hs = d.holdings.slice(0, 8);
    hs.forEach((x, i) => {
      const y = 240 + i * 82;
      g.font = f(SANS, 44); g.fillStyle = INK; g.fillText(x.label, 2020, y);
      g.font = f(MONO, 32); g.fillStyle = tone(x.returnPct); const r = x.returnPct == null ? "—" : pct(x.returnPct, true); g.fillText(r, w - 90 - g.measureText(r).width, y);
      g.fillStyle = "rgba(243,242,237,0.08)"; g.fillRect(2020, y + 16, w - 2110, 10);
      g.fillStyle = INK; g.fillRect(2020, y + 16, (w - 2110) * x.weight, 10);
      g.font = f(MONO, 26); g.fillStyle = MUTE; g.fillText(pct(x.weight), 2300, y);
    });
  });
}

/** LED band on the mezzanine fascias: holdings and their returns, scrolling */
export function tickerBand(d: ScreenData) {
  const items = d.holdings.map((h) => [h.label, h.returnPct == null ? "—" : pct(h.returnPct, true), tone(h.returnPct)] as const);
  const r = canvasTexture(4096, 64, (g, w, h) => {
    g.fillStyle = BG; g.fillRect(0, 0, w, h);
    let x = 20;
    while (x < w) {
      for (const [l, v, c] of items) {
        g.font = f(SANS, 34); g.fillStyle = INK; g.fillText(l, x, 45); x += g.measureText(l).width + 16;
        g.font = f(MONO, 30); g.fillStyle = c; g.fillText(v, x, 45); x += g.measureText(v).width + 26;
        g.fillStyle = LIME; g.fillRect(x, 28, 6, 6); x += 32;
      }
    }
  });
  r.texture.wrapS = THREE.RepeatWrapping; r.texture.repeat.set(4, 1);
  return r;
}

/** desk monitors: one holding per screen, cycling through the portfolio */
export function deskScreen(d: ScreenData, i: number) {
  const hs = d.holdings; const x = hs[i % Math.max(1, hs.length)];
  return canvasTexture(512, 290, (g, w, h) => {
    g.fillStyle = BG; g.fillRect(0, 0, w, h);
    if (!x) return;
    if (i % 4 === 3) { indexChart(g, d, 28, 40, w - 90, h - 110); return; }
    g.font = f(MONO, 18); g.fillStyle = MUTE; g.fillText(x.assetClass.toUpperCase(), 28, 44);
    g.font = f(SANS, 58); g.fillStyle = INK; g.fillText(x.label, 28, 120);
    g.font = f(SANS, 22); g.fillStyle = MUTE; g.fillText(x.name.slice(0, 34), 28, 156);
    g.font = f(MONO, 20); g.fillStyle = MUTE; g.fillText("WEIGHT", 28, 214); g.fillText("RETURN", 260, 214);
    g.font = f(SANS, 40); g.fillStyle = INK; g.fillText(pct(x.weight), 28, 262);
    g.fillStyle = tone(x.returnPct); g.fillText(x.returnPct == null ? "—" : pct(x.returnPct, true), 260, 262);
  });
}

/** plaque on each holding's exhibit in the Investment Gallery */
export function plaque(x: ScreenData["holdings"][number]) {
  return canvasTexture(640, 360, (g, w, h) => {
    g.fillStyle = "#0b0c0e"; g.fillRect(0, 0, w, h);
    g.font = f(MONO, 22); g.fillStyle = LIME; g.fillText(x.assetClass.toUpperCase(), 36, 58);
    g.font = f(SANS, 76); g.fillStyle = INK; g.fillText(x.label, 36, 150);
    g.font = f(SANS, 26); g.fillStyle = MUTE; g.fillText(x.name.slice(0, 38), 36, 196);
    g.font = f(MONO, 22); g.fillStyle = MUTE; g.fillText("WEIGHT", 36, 262); g.fillText("RETURN", 236, 262); if (x.value) g.fillText("VALUE", 436, 262);
    g.font = f(SANS, 44); g.fillStyle = INK; g.fillText(pct(x.weight), 36, 318);
    g.fillStyle = tone(x.returnPct); g.fillText(x.returnPct == null ? "—" : pct(x.returnPct, true), 236, 318);
    if (x.value) { g.fillStyle = INK; g.fillText(x.value, 436, 318); }
  });
}
