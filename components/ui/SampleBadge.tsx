/** Marks anything driven by development sample data. Disappears automatically once real data is loaded. */
export default function SampleBadge({ show, label = "Sample data — not real" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-lavender-deep/40 bg-lavender/40 px-3 py-[6px] text-[10px] uppercase tracking-[0.22em] text-lavender-deep">
      <span className="h-1.5 w-1.5 rounded-full bg-lavender-deep" />{label}
    </span>
  );
}
