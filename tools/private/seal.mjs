#!/usr/bin/env node
/**
 * Runs after `next build` (npm run build:pages). Seals the private view:
 *   - out/private/index.html (the full-figures page) is encrypted with PRIVATE_VIEW_PASSWORD and replaced by a small
 *     unlock page; in the browser the right password decrypts it and the page loads as normal
 *   - every other file that carries the private page's data (Next's .txt page-data payloads) is deleted
 *   - without a password, the private page is removed entirely
 * Then the whole of out/ is scanned for the private page's sentinel: if any unencrypted private content would be
 * published, the build fails.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { encrypt } from "./vault.mjs";

export const SENTINEL = "PRIVATE-VIEW-SENTINEL-7f3a";
const OUT = join(process.cwd(), "out");
const DIR = join(OUT, "private");
const PAGE = join(DIR, "index.html");

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const TEXT = /\.(html|txt|js|json|xml|css|rsc|map)$/;
const leaks = () => walk(OUT).filter((f) => TEXT.test(f) && readFileSync(f, "utf8").includes(SENTINEL));

function unlockPage(box) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#08090A">
<title>Private view</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; background: #08090A; color: #f3f2ed;
    font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }
  form { width: min(420px, 100%); display: flex; flex-direction: column; gap: 18px; }
  .eyebrow { font: 10px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .24em; text-transform: uppercase; color: #d9c09b; }
  h1 { margin: 0; font: italic 400 40px/1.05 Georgia, "Times New Roman", serif; }
  p { margin: 0; color: rgba(243,242,237,.6); font-size: 14px; }
  input { width: 100%; height: 52px; padding: 0 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18);
    background: rgba(255,255,255,.04); color: inherit; font: inherit; outline: none; }
  input:focus { border-color: #d9c09b; }
  button { height: 52px; border: 0; border-radius: 14px; background: #d9c09b; color: #08090A; cursor: pointer;
    font: 11px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .22em; text-transform: uppercase; }
  button[disabled] { opacity: .6; cursor: progress; }
  .err { color: #d99a91; min-height: 1.6em; }
  a { color: rgba(243,242,237,.6); font-size: 13px; }
</style></head>
<body>
<form id="f" autocomplete="on">
  <span class="eyebrow">Private view</span>
  <h1>Full figures, for the owner.</h1>
  <p>Values, amounts and quantities, decrypted on this device only. Nothing is sent anywhere.</p>
  <input id="u" name="username" autocomplete="username" value="private-view" hidden>
  <input id="pw" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required autofocus>
  <button id="go" type="submit">Unlock</button>
  <span class="err" id="err" role="alert"></span>
  <a href="../">← Back to the public site</a>
</form>
<script>
const BOX = ${JSON.stringify(box)};
const u8 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const go = document.getElementById("go"), err = document.getElementById("err");
  go.disabled = true; go.textContent = "Unlocking…"; err.textContent = "";
  try {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(document.getElementById("pw").value), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: u8(BOX.salt), iterations: BOX.iter }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8(BOX.iv) }, key, u8(BOX.ct)));
    document.open(); document.write(html); document.close();
  } catch {
    err.textContent = "That password is not right."; go.disabled = false; go.textContent = "Unlock";
  }
});
</script>
</body></html>
`;
}

async function main() {
  if (!existsSync(OUT)) throw new Error("out/ not found: run next build first");
  const pw = process.env.PRIVATE_VIEW_PASSWORD;
  if (existsSync(DIR)) {
    if (!pw) { rmSync(DIR, { recursive: true, force: true }); console.log("Private view: no PRIVATE_VIEW_PASSWORD, private page removed."); }
    else {
      const html = readFileSync(PAGE, "utf8");
      if (!html.includes(SENTINEL)) throw new Error("out/private/index.html does not look like the private page (sentinel missing)");
      for (const f of walk(DIR)) if (f !== PAGE) rmSync(f);
      writeFileSync(PAGE, unlockPage(await encrypt(html, pw)));
      console.log("Private view: sealed out/private/index.html.");
    }
  }
  // page-data payloads elsewhere that carry the private page's data are deleted; anything else is a hard failure
  for (const f of leaks()) {
    if (f.endsWith(".txt") || f.endsWith(".rsc")) { rmSync(f); console.log(`Private view: removed ${relative(OUT, f)}`); }
  }
  const left = leaks();
  if (left.length) throw new Error(`Unencrypted private content would be published: ${left.map((f) => relative(OUT, f)).join(", ")}`);
  console.log("Private view: no unencrypted private content in out/.");
}

main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
