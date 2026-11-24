#!/usr/bin/env node
/**
 * Password encryption shared by the build (Node) and the browser (the private view's unlock page): PBKDF2-SHA256
 * (600 000 iterations) derives an AES-256-GCM key from the password; the output is JSON
 * { v, iter, salt, iv, ct } with base64 fields. GCM authenticates: a wrong password or a modified file fails to decrypt.
 *
 *   node tools/private/vault.mjs encrypt <in> <out>   password from PRIVATE_VIEW_PASSWORD
 *   node tools/private/vault.mjs decrypt <in> <out>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

export const ITER = 600_000;
const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function key(password, salt, iter) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encrypt(plaintext, password) {
  if (!password || password.length < 12) throw new Error("PRIVATE_VIEW_PASSWORD must be at least 12 characters");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(password, salt, ITER), new TextEncoder().encode(plaintext)));
  return { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

export async function decrypt(box, password) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, await key(password, unb64(box.salt), box.iter), unb64(box.ct));
  return new TextDecoder().decode(pt);
}

async function main() {
  const [cmd, input, output] = process.argv.slice(2);
  const pw = process.env.PRIVATE_VIEW_PASSWORD;
  if (!pw) { console.error("PRIVATE_VIEW_PASSWORD is not set"); process.exit(1); }
  if (cmd === "encrypt") writeFileSync(output, `${JSON.stringify(await encrypt(readFileSync(input, "utf8"), pw))}\n`);
  else if (cmd === "decrypt") {
    try { writeFileSync(output, await decrypt(JSON.parse(readFileSync(input, "utf8")), pw)); }
    catch { console.error(`Could not decrypt ${input}: wrong PRIVATE_VIEW_PASSWORD or a damaged file.`); process.exit(1); }
  } else { console.error("usage: vault.mjs encrypt|decrypt <in> <out>"); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
