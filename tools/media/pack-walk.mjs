// Packs the headquarters walk's frames into one file per resolution (out/media/journey/{hi,lo}.pack) after the
// static export, and records each frame's byte length in the exported manifest ("packs"). The page then fetches the
// walk as one streamed download instead of 131 requests (a first visit was latency-bound: one round trip per frame),
// and each frame is usable as soon as its bytes have arrived. The individual frames stay published as the fallback.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "out", "media", "journey");
const manifestPath = join(dir, "manifest.json");
const m = JSON.parse(readFileSync(manifestPath, "utf8"));
m.packs = {};
for (const [key, pattern] of [["hi", m.hi], ["lo", m.loPath]]) {
  const parts = Array.from({ length: m.frames }, (_, i) => readFileSync(join(dir, pattern.replace("{i}", String(i).padStart(4, "0")))));
  const file = `${key}.pack`;
  writeFileSync(join(dir, file), Buffer.concat(parts));
  m.packs[key] = { file, sizes: parts.map((p) => p.length) };
  console.log(`Walk pack: ${file}, ${m.frames} frames, ${(parts.reduce((a, p) => a + p.length, 0) / 1e6).toFixed(1)} MB`);
}
writeFileSync(manifestPath, JSON.stringify(m));
