#!/usr/bin/env node
/**
 * Headquarters walk → scroll-scrubbed WebP frame sequence.
 *
 *   node tools/media/frames.mjs [--analyse] [--doors <index>]
 *
 * 1. Finds the best join between the two clips: every frame from the last 3 s of
 *    media-src/headquarters-establishing.mp4 is compared with every frame from the first 4 s of
 *    headquarters-arrival.mp4 (96×54 luma, mean absolute difference), also allowing a small centre zoom on either
 *    side so the portal can be matched at the same size. The pair with the lowest difference is the join.
 * 2. Builds one continuous walk: establishing start → join → arrival from the join → end, with an 8-frame
 *    cross-dissolve at the join (and the zoom eased in over the frames before it, so nothing jumps).
 * 3. Grades every frame the same way as public/scenes (blacks on the page colour #08090A, warm highlights; the
 *    grain is added live by the player) and exports WebP at the source's full resolution (q80) and 854×480 (q76). If the full set would
 *    exceed ~10 MB (hi) / ~4 MB (lo), every second frame is kept instead.
 * 4. Writes public/media/journey/manifest.json: frame count, size, fps, the join and the frame where the
 *    camera passes the doors (detected as the largest jump in ceiling brightness, or --doors).
 *
 * Requires ffmpeg/ffprobe with libwebp on PATH. Output is deterministic (fixed grain seed).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync, statSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = new URL("../../", import.meta.url).pathname;
const SRC = { est: join(ROOT, "media-src/headquarters-establishing.mp4"), arr: join(ROOT, "media-src/headquarters-arrival.mp4") };
const OUT = join(ROOT, "public/media/journey");
const TMP = join(tmpdir(), `hq-frames-${process.pid}`);
const args = process.argv.slice(2);
const ANALYSE_ONLY = args.includes("--analyse");
const DOORS_OVERRIDE = args.includes("--doors") ? +args[args.indexOf("--doors") + 1] : null;
const BUDGET_HI = 10.5e6, BUDGET_LO = 4.2e6;
const DISSOLVE = 8;
const AW = 96, AH = 54;

const run = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${a.join(" ")}\n${r.stderr?.toString().slice(-2000)}`);
  return r.stdout;
};
const probe = (f) => {
  const [w, h, rate, n] = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames", "-of", "csv=p=0", f]).toString().trim().split(",");
  const [a, b] = rate.split("/").map(Number);
  return { w: +w, h: +h, fps: a / (b || 1), n: +n };
};
/** all frames as small luma rasters */
const luma = (f) => {
  const buf = run("ffmpeg", ["-v", "error", "-i", f, "-vf", `scale=${AW}:${AH}:flags=area,format=gray`, "-f", "rawvideo", "-"]);
  const frames = [];
  for (let o = 0; o + AW * AH <= buf.length; o += AW * AH) frames.push(new Float32Array(buf.subarray(o, o + AW * AH)));
  return frames;
};
/** zoom by s (≥1) about the centre, then shift the view by dx (fraction of width), bilinear */
const zoom = (img, s, dx = 0) => {
  if (s === 1 && dx === 0) return img;
  const out = new Float32Array(AW * AH);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const sx = (x - AW / 2 + 0.5) / s + AW / 2 - 0.5 + dx * AW, sy = (y - AH / 2 + 0.5) / s + AH / 2 - 0.5;
    const x0 = Math.max(0, Math.min(AW - 2, Math.floor(sx))), y0 = Math.max(0, Math.min(AH - 2, Math.floor(sy)));
    const fx = sx - x0, fy = sy - y0, i = y0 * AW + x0;
    out[y * AW + x] = (img[i] * (1 - fx) + img[i + 1] * fx) * (1 - fy) + (img[i + AW] * (1 - fx) + img[i + AW + 1] * fx) * fy;
  }
  return out;
};
/**
 * Framing difference: 1 − normalised cross-correlation of centre-weighted luma. Exposure and sky colour differ
 * between the clips; what has to line up is the bright portal opening against the dark stone around it —
 * its size and position in frame. Normalising removes the exposure difference; the centre weighting keeps the
 * portal (not the sky or the plaza) in charge.
 */
const WEIGHT = (() => { const w = new Float32Array(AW * AH); for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) { const u = (x / AW - 0.5) / 0.32, v = (y / AH - 0.55) / 0.34; w[y * AW + x] = Math.exp(-(u * u + v * v) / 2); } return w; })();
const norm = (img) => {
  let m = 0, ws = 0; for (let i = 0; i < img.length; i++) { m += img[i] * WEIGHT[i]; ws += WEIGHT[i]; } m /= ws;
  const out = new Float32Array(img.length); let sd = 0;
  for (let i = 0; i < img.length; i++) { out[i] = (img[i] - m) * Math.sqrt(WEIGHT[i]); sd += out[i] * out[i]; }
  sd = Math.sqrt(sd) || 1; for (let i = 0; i < out.length; i++) out[i] /= sd;
  return out;
};
const sobel = (img) => {
  const out = new Float32Array(AW * AH);
  for (let y = 1; y < AH - 1; y++) for (let x = 1; x < AW - 1; x++) {
    const i = y * AW + x;
    const gx = img[i - AW + 1] + 2 * img[i + 1] + img[i + AW + 1] - img[i - AW - 1] - 2 * img[i - 1] - img[i + AW - 1];
    const gy = img[i + AW - 1] + 2 * img[i + AW] + img[i + AW + 1] - img[i - AW - 1] - 2 * img[i - AW] - img[i - AW + 1];
    out[i] = Math.hypot(gx, gy);
  }
  return out;
};
/** descriptor: normalised luma (where the bright opening is) + normalised edges (where the portal's lines are) */
const describe = (img) => ({ l: norm(img), e: norm(sobel(img)) });
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const mad = (a, b) => 1 - 0.5 * (dot(a.l, b.l) + dot(a.e, b.e));

// ---------------------------------------------------------------- 1. the join
const E = probe(SRC.est), A = probe(SRC.arr);
console.log(`establishing ${E.w}×${E.h} ${E.fps} fps ${E.n} frames · arrival ${A.w}×${A.h} ${A.fps} fps ${A.n} frames`);
const le = luma(SRC.est), la = luma(SRC.arr);
// candidate framings: zoom 1–1.5 and a horizontal re-centre of ±24 % (the portals sit at different x)
const FRAMINGS = [];
// the shifted view must stay inside the zoomed frame (no edge smearing): |dx| ≤ (s − 1) / 2s
for (let s = 1; s <= 1.501; s += 0.05) for (let dx = -0.24; dx <= 0.2401; dx += 0.02) if (Math.abs(dx) <= (s - 1) / (2 * s) + 1e-9) FRAMINGS.push({ s: +s.toFixed(2), dx: +dx.toFixed(2) });
let best = { d: Infinity, i: 0, j: 0, side: "none", s: 1, dx: 0 };
const iFrom = Math.max(DISSOLVE, le.length - Math.round(3 * E.fps)), jTo = Math.min(la.length - DISSOLVE, Math.round(5 * A.fps)); // first 5 s: the arrival portal only reaches the establishing portal's size after ~4 s
// Only the establishing side is reframed: a zoom there is eased in *before* the join, so it reads as the camera
// pushing forward. Reframing the arrival would have to ease back out afterwards and look like a step backwards.
const zA = la.map((f, k) => (k < jTo ? describe(f) : null));
for (const side of ["establishing"]) {
  for (const fr of FRAMINGS) {
    const zE = le.map((f, k) => (k >= iFrom ? describe(side === "establishing" ? zoom(f, fr.s, fr.dx) : f) : null));
    for (let i = iFrom; i < le.length - DISSOLVE / 2; i++) for (let j = DISSOLVE / 2; j < jTo; j++) {
      const d = mad(zE[i], zA[j]);
      if (d < best.d) best = { d, i, j, side, ...fr };
    }
  }
}
if (best.s === 1 && best.dx === 0) best.side = "none";
console.log(`join: establishing ${best.i} (${(best.i / E.fps).toFixed(2)} s) ↔ arrival ${best.j} (${(best.j / A.fps).toFixed(2)} s), reframe ${best.side} ×${best.s} dx ${best.dx}, framing difference ${best.d.toFixed(3)}`);

// ---------------------------------------------------------------- 2. the continuous walk (a list of compositing instructions)
const h = DISSOLVE / 2, RAMP = 24;
const seq = [];
// establishing frames before the dissolve; if establishing is zoomed, ease the zoom in over RAMP frames
for (let k = 0; k < best.i - h; k++) {
  const t = best.side === "establishing" ? Math.max(0, 1 - (best.i - h - k) / RAMP) : 0;
  const e = t * t * (3 - 2 * t);
  seq.push({ a: ["est", k], zA: 1 + (best.s - 1) * e, dA: best.dx * e });
}
for (let k = 0; k < DISSOLVE; k++) {
  const t = (k + 0.5) / DISSOLVE, w = t * t * (3 - 2 * t);
  const onE = best.side === "establishing", onA = best.side === "arrival";
  seq.push({ a: ["est", best.i - h + k], zA: onE ? best.s : 1, dA: onE ? best.dx : 0, b: ["arr", best.j - h + k], zB: onA ? best.s : 1, dB: onA ? best.dx : 0, w });
}
// arrival after the dissolve; if arrival was zoomed to match, ease the zoom back out over RAMP frames
for (let k = best.j + h; k < la.length; k++) {
  const t = best.side === "arrival" ? Math.max(0, 1 - (k - best.j - h) / RAMP) : 0;
  const e = t * t * (3 - 2 * t);
  seq.push({ a: ["arr", k], zA: 1 + (best.s - 1) * e, dA: best.dx * e });
}
const joinAt = best.i - h + DISSOLVE / 2;

// doors: the arrival frame where the ceiling band brightens most sharply (the soffit gives way to the lit floor)
const top = (f) => { let s = 0; for (let y = 0; y < Math.round(AH * 0.18); y++) for (let x = 0; x < AW; x++) s += f[y * AW + x]; return s / (Math.round(AH * 0.18) * AW); };
let doorsArr = best.j + h, jump = -Infinity;
for (let k = Math.max(best.j + h + 2, Math.round(la.length * 0.55)); k < la.length - 2; k++) {
  const dj = top(la[k + 2]) - top(la[k - 2]);
  if (dj > jump) { jump = dj; doorsArr = k; }
}
let doors = seq.findIndex((f) => f.a[0] === "arr" && f.a[1] === doorsArr);
if (DOORS_OVERRIDE != null) doors = DOORS_OVERRIDE;
console.log(`sequence ${seq.length} frames · join at ${joinAt} · doors at ${doors} (arrival ${doorsArr})`);
if (ANALYSE_ONLY) process.exit(0);

// ---------------------------------------------------------------- 3. composite, grade, encode
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, "est"), { recursive: true }); mkdirSync(join(TMP, "arr")); mkdirSync(join(TMP, "seq"));
run("ffmpeg", ["-v", "error", "-i", SRC.est, join(TMP, "est", "%04d.png")]);
run("ffmpeg", ["-v", "error", "-i", SRC.arr, join(TMP, "arr", "%04d.png")]);
const src = ([clip, k]) => join(TMP, clip, `${String(k + 1).padStart(4, "0")}.png`);
const W = E.w, H = E.h;
/** the same framing as zoom(): scale by z about the centre, then move the view by dx·W */
const zf = (z, dx = 0) => {
  if (z === 1 && dx === 0) return "null";
  const sw = Math.round(W * z / 2) * 2, sh = Math.round(H * z / 2) * 2;
  const x = Math.max(0, Math.min(sw - W, Math.round((sw - W) / 2 + dx * W * z))), y = Math.round((sh - H) / 2);
  return `scale=${sw}:${sh}:flags=lanczos,crop=${W}:${H}:${x}:${y}`;
};
seq.forEach((f, n) => {
  const dst = join(TMP, "seq", `${String(n).padStart(4, "0")}.png`);
  if (!f.b && f.zA === 1 && !f.dA) { renameOrCopy(src(f.a), dst); return; }
  const fc = f.b
    ? `[0]${zf(f.zA, f.dA)}[a];[1]${zf(f.zB, f.dB)}[b];[a][b]blend=all_expr='A*(1-${f.w.toFixed(4)})+B*${f.w.toFixed(4)}'`
    : `[0]${zf(f.zA, f.dA)}`;
  run("ffmpeg", ["-v", "error", "-y", "-i", src(f.a), ...(f.b ? ["-i", src(f.b)] : []), "-filter_complex", fc, dst]);
});
function renameOrCopy(a, b) { run("cp", [a, b]); }

// one shared grade, matching public/scenes: lift blacks to #08090A, cool-neutral shadows, warm highlights, fine grain
const GRADE = [
  "curves=r='0/0.031 0.25/0.22 0.75/0.79 1/0.985':g='0/0.035 0.25/0.22 0.75/0.77 1/0.965':b='0/0.039 0.25/0.23 0.75/0.73 1/0.93'",
  "eq=saturation=0.92:contrast=1.03",
].join(",");
// Grain is not baked in: it would triple the WebP size. The player draws one shared, animated grain layer over the
// walk and the rooms alike, so the whole journey carries the same texture.
const encode = (step, dir, scale, q) => {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const sel = step === 1 ? "" : `select='not(mod(n\\,${step}))',`;
  run("ffmpeg", ["-v", "error", "-y", "-framerate", "24", "-i", join(TMP, "seq", "%04d.png"), "-vf", `${sel}${GRADE}${scale ? `,scale=${scale}:flags=lanczos` : ""}`, "-fps_mode", "passthrough",
    "-c:v", "libwebp", "-quality", String(q), "-compression_level", "6", "-preset", "photo", "-start_number", "0", join(dir, "f%04d.webp")]);
  return readdirSync(dir).reduce((s, x) => s + statSync(join(dir, x)).size, 0);
};
mkdirSync(OUT, { recursive: true });
let step = 1, hi = encode(1, join(OUT, "hi"), null, 80);
if (hi > BUDGET_HI) { step = 2; hi = encode(2, join(OUT, "hi"), null, 80); }
let lo = encode(step, join(OUT, "lo"), "854:480", 64);
const count = readdirSync(join(OUT, "hi")).length;
// poster: the first frame, graded, as the server-rendered LCP image
run("ffmpeg", ["-v", "error", "-y", "-i", join(TMP, "seq", "0000.png"), "-vf", GRADE, "-c:v", "libwebp", "-quality", "84", join(OUT, "poster.webp")]);
run("ffmpeg", ["-v", "error", "-y", "-i", join(TMP, "seq", "0000.png"), "-vf", `${GRADE},scale=854:480:flags=lanczos`, "-c:v", "libwebp", "-quality", "80", join(OUT, "poster-sm.webp")]);
run("ffmpeg", ["-v", "error", "-y", "-i", join(TMP, "seq", `${String(seq.length - 1).padStart(4, "0")}.png`), "-vf", GRADE, "-c:v", "libwebp", "-quality", "84", join(OUT, "last.webp")]);

const manifest = {
  w: W, h: H, lo: { w: 854, h: 480 }, fps: 24 / step, frames: count, step,
  hi: "hi/f{i}.webp", lo_: undefined, loPath: "lo/f{i}.webp", poster: "poster.webp", posterSm: "poster-sm.webp", last: "last.webp",
  join: Math.round(joinAt / step), doors: Math.round(doors / step),
  source: { establishing: { frames: E.n, join: best.i }, arrival: { frames: A.n, join: best.j, doors: doorsArr }, reframe: { side: best.side, scale: best.s, dx: best.dx }, mad: +best.d.toFixed(3) },
};
delete manifest.lo_;
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
rmSync(TMP, { recursive: true, force: true });
console.log(`frames ${count} (every ${step === 1 ? "" : "2nd "}frame) · hi ${(hi / 1e6).toFixed(2)} MB · lo ${(lo / 1e6).toFixed(2)} MB · join ${manifest.join} · doors ${manifest.doors}`);
void existsSync; void renameSync;
