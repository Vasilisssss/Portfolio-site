import { portfolio } from "@/content/portfolio";

/** Shown wherever figures come from sample data. Disappears once `portfolio.illustrative` is false. */
export default function SampleBadge({ label = "Illustrative sample data", force = false }: { label?: string; force?: boolean }) {
  if (!portfolio.illustrative && !force) return null;
  return <span className="inline-flex border border-gold px-3 py-[7px] text-[10px] uppercase tracking-[0.24em] text-gold">{label}</span>;
}
