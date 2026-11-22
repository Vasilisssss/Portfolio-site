import type { AssetClass } from "@/lib/types";
import { makeArt, type ArtKind } from "@/lib/art";

const KIND: Record<AssetClass, ArtKind> = {
  Stocks: "eq", ETFs: "pe", Cryptocurrency: "vc", "Real Estate": "re", Bonds: "fi",
  Cash: "cash", "Precious Metals": "alt", "Private Investments": "sh", "Other Assets": "sh",
};

/** Procedural line drawing per asset class: graphite hairlines with a coloured accent stroke. */
export default function CardArt({ assetClass, kind, seed = 1, accent = "var(--color-lavender-deep)", className, viewBox = "0 0 400 300" }: {
  assetClass?: AssetClass; kind?: ArtKind | "feature"; seed?: number; accent?: string; className?: string; viewBox?: string;
}) {
  const { a, b } = makeArt(kind ?? (assetClass ? KIND[assetClass] : "feature"), seed);
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden className={className}>
      <path d={a} fill="none" stroke="var(--color-graphite)" strokeWidth={0.5} opacity={0.32} />
      <path d={b} fill="none" stroke={accent} strokeWidth={1.1} />
    </svg>
  );
}
