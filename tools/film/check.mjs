// Build guard: the rendered film shows figures baked into its frames. If the site's data changed since the film
// was rendered, stop the build rather than publish stale numbers. Re-render with tools/film (see README).
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const out = process.argv[2] ?? "out";
const manifestPath = "public/film/manifest.json";
if (!existsSync(manifestPath)) { console.log("film: no manifest, nothing to check"); process.exit(0); }
const d = JSON.parse(readFileSync(`${out}/film-data.json`, "utf8")).data;
const s = d.summary ?? {};
const f4 = (x) => x.toFixed(4), f3 = (x) => x.toFixed(3);
const parts = [
  ...d.holdings.map((h) => `${h.label}|${f4(h.weight)}|${h.returnPct == null ? "" : f4(h.returnPct)}|${h.value ?? ""}`),
  ...d.history.map((p) => `${p.date}|${f3(p.index)}`),
  ...["asOf", "currency", "value", "invested", "pnl", "totalReturn", "twr"].map((k) => `${k}=${s[k] ?? ""}`),
];
const fp = createHash("sha256").update(parts.join("\n")).digest("hex").slice(0, 16);
const m = JSON.parse(readFileSync(manifestPath, "utf8"));
if (m.fingerprint !== fp) {
  console.error(`film: STALE — rendered for data ${m.fingerprint} (as of ${m.asOf}), site data is ${fp}. Re-render the film (tools/film) before publishing.`);
  process.exit(1);
}
console.log(`film: matches the site data (as of ${m.asOf})`);
