/** Data the world may show: the page's privacy-filtered public view (see lib/world-data.ts). */
export interface WorldHolding { id: string; label: string; name: string; weight: number; returnPct: number | null; assetClass: string; value?: string }
export interface WorldSummary { value?: string; invested?: string; pnl?: string; pnlSign?: number; totalReturn?: string; twr?: string; asOf: string; currency: string }
export interface WorldData { holdings: WorldHolding[]; history: { date: string; index: number }[]; summary?: WorldSummary }
export interface LabelOut { id: string; x: number; y: number; opacity: number }
export interface WorldCallbacks {
  onLabels: (labels: LabelOut[]) => void;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}
