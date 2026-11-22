import type { ArtKind } from "@/content/portfolio";
import { makeArt } from "@/lib/art";

export default function CardArt({ kind, seed = 1, className, viewBox = "0 0 400 300", strong = false }: { kind: ArtKind | "feature"; seed?: number; className?: string; viewBox?: string; strong?: boolean }) {
  const { a, b } = makeArt(kind, seed);
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden className={className}>
      <path d={a} fill="none" stroke="var(--color-ivory)" strokeWidth={strong ? 0.5 : 0.6} opacity={0.38} />
      <path d={b} fill="none" stroke="var(--color-gold)" strokeWidth={strong ? 0.9 : 1} />
    </svg>
  );
}
