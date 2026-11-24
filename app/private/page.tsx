import type { Metadata } from "next";
import { getPublicView } from "@/lib/public";
import HomePage from "@/components/pages/HomePage";
import StayInPage from "@/components/chrome/StayInPage";

/**
 * PRIVATE VIEW — the home page with every figure (values, amounts, quantities, prices), for the owner only.
 * It is never published as is: after the build, tools/private/seal.mjs encrypts this page with PRIVATE_VIEW_PASSWORD
 * (AES-256-GCM) and replaces it with an unlock page; the build fails if any unencrypted copy of it is left in out/.
 * Without PRIVATE_VIEW_PASSWORD at build time this route renders no data and is removed from the output.
 */
export const metadata: Metadata = { title: "Private view", robots: { index: false, follow: false } };

// must match SENTINEL in tools/private/seal.mjs: lets the build prove no unencrypted copy is published
const SENTINEL = "PRIVATE-VIEW-SENTINEL-7f3a";

export default function PrivateView() {
  if (!process.env.PRIVATE_VIEW_PASSWORD) return <p className="container-x py-40 text-mute">Private view is not configured.</p>;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return (
    <>
      <span hidden data-private>{SENTINEL}</span>
      <StayInPage />
      <HomePage view={getPublicView({ reveal: true })} owner />
      <div className="fixed bottom-4 left-4 z-[70] flex items-center gap-3 rounded-full border border-ice-deep/40 bg-black/75 py-2 pl-4 pr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ice-deep backdrop-blur">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ice-deep" />
        Private view
        <a href={`${base}/`} className="rounded-full border border-white/20 px-3 py-1.5 text-graphite transition-colors hover:border-ice-deep hover:text-ice-deep">Lock</a>
      </div>
    </>
  );
}
