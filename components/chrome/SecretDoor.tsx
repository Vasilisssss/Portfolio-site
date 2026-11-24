"use client";
import { useRef } from "react";

/**
 * The private view's hidden entrance: three quick clicks (or taps) on the wrapped text open /private/. Nothing about it
 * is visible: no link, no cursor change, no hover. The private page itself stays encrypted either way, so hiding it is
 * only about keeping the public site clean. Rendered only when a private view exists.
 */
export default function SecretDoor({ children }: { children: React.ReactNode }) {
  const clicks = useRef<number[]>([]);
  const onClick = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 900), now];
    if (clicks.current.length >= 3) {
      clicks.current = [];
      window.getSelection()?.removeAllRanges();
      location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/private/`;
    }
  };
  return <span onClick={onClick}>{children}</span>;
}
