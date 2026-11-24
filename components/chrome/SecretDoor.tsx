"use client";
import { useEffect, useRef } from "react";

/**
 * The private view's hidden entrance (rendered only when a private view exists). Two deliberate gestures, nothing
 * visible:
 *   - type the door word anywhere on the page (no text field: just type while the site is open)
 *   - press and hold the wrapped text (the footer's copyright line) for 3 s without moving: works on phones too
 * Only a SHA-256 fingerprint of the word is in the code, so reading the source does not reveal it. The private page
 * stays encrypted either way; this only keeps the entrance out of sight. To change the word: put
 * sha256(new word in lowercase) in WORD_SHA256 and its length in WORD_LENGTH.
 */
const WORD_SHA256 = "e6f0a1fbb43c89196dcfcbef85908f19ab4c5f7cc4f4c452284697757683d7ef";
const WORD_LENGTH = 5;
const HOLD_MS = 3000;

const open = () => { location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/private/`; };
const sha256 = async (s: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");

export default function SecretDoor({ children }: { children: React.ReactNode }) {
  const hold = useRef<{ t: number; x: number; y: number } | null>(null);

  // the typed word
  useEffect(() => {
    let typed = "";
    const onKey = async (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || el?.closest?.("input, textarea, select, [contenteditable]")) return;
      if (!/^[a-z0-9]$/i.test(e.key)) { typed = ""; return; }
      typed = (typed + e.key.toLowerCase()).slice(-WORD_LENGTH);
      if (typed.length === WORD_LENGTH && crypto?.subtle && (await sha256(typed)) === WORD_SHA256) open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the long press
  const cancel = () => { if (hold.current) { window.clearTimeout(hold.current.t); hold.current = null; } };
  const onDown = (e: React.PointerEvent) => {
    cancel();
    hold.current = { t: window.setTimeout(() => { hold.current = null; open(); }, HOLD_MS), x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 10) cancel();
  };
  useEffect(() => cancel, []);

  return (
    <span onPointerDown={onDown} onPointerMove={onMove} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onContextMenu={(e) => { if (hold.current) e.preventDefault(); }}
      className="select-none [-webkit-touch-callout:none]">
      {children}
    </span>
  );
}
