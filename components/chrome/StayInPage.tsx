"use client";
import { useEffect } from "react";
import { scrollToTarget } from "@/components/motion/gsap";

/**
 * For the private view: links to a section of the home page ("/#investments") scroll within this page instead of
 * leaving for the public home page. Runs in the capture phase, before next/link and the nav's own handler.
 */
export default function StayInPage() {
  useEffect(() => {
    const home = (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/";
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname !== home && url.pathname !== home.slice(0, -1)) || !url.hash) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const el = document.getElementById(id);
      if (!el && id !== "top") return;
      e.preventDefault(); e.stopPropagation();
      history.replaceState(null, "", `#${id}`);
      // let a closing menu finish first
      window.dispatchEvent(new Event("stayinpage:navigate"));
      window.setTimeout(() => scrollToTarget(id === "top" || !el ? 0 : el), 80);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
