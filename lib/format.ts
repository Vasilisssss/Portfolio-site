import { site } from "@/content/site";

const full = new Intl.NumberFormat("en-US", { style: "currency", currency: site.currency, maximumFractionDigits: 0 });
const SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF " };

export const money = (v: number) => full.format(v);
/** Deterministic compact currency (Intl compact rounding differs between Node and browsers → hydration errors). */
export const moneyCompact = (v: number) => {
  const sym = SYMBOL[site.currency] ?? "";
  const abs = Math.abs(v), sign = v < 0 ? "-" : "";
  const [div, suf] = abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : abs >= 1e3 ? [1e3, "K"] : [1, ""];
  const n = abs / div;
  const s = n >= 100 || div === 1 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, "");
  return `${sign}${sym}${s}${suf}`;
};
export const pct = (v: number, signed = false) => `${signed && v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
// Fixed month names: Intl output differs between Node and browsers ("Sep" vs "Sept"), which breaks hydration.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const dateLong = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d} ${MONTHS[+m - 1]} ${y}`;
};
export const pad2 = (n: number) => String(n).padStart(2, "0");
