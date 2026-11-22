/**
 * Deterministic formatting. Intl output differs between Node and browsers (compact rounding, "Sep"/"Sept"),
 * which breaks hydration — so compact numbers and dates are formatted by hand.
 */
const SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF ", JPY: "¥" };
const sym = (cur: string) => SYMBOL[cur] ?? `${cur} `;

/** Whole units from 1,000 up; cents below that, so small balances and differences stay meaningful. */
export const money = (v: number, cur = "USD", digits?: number) => {
  const sign = v < 0 ? "−" : "";
  const dp = digits ?? (Math.abs(v) < 1000 ? 2 : 0);
  const [i, d] = Math.abs(v).toFixed(dp).split(".");
  return `${sign}${sym(cur)}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${d ? "." + d : ""}`;
};

export const moneyCompact = (v: number, cur = "USD") => {
  const abs = Math.abs(v), sign = v < 0 ? "−" : "";
  const [div, suf] = abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : abs >= 1e3 ? [1e3, "K"] : [1, ""];
  const n = abs / div;
  const s = n >= 100 || div === 1 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, "");
  return `${sign}${sym(cur)}${s}${suf}`;
};

/** signed money, e.g. +$1,200 */
export const moneySigned = (v: number, cur = "USD") => (v > 0 ? "+" : "") + money(v, cur);

export const pct = (v: number, signed = false, digits = 1) => `${signed && v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(digits)}%`;

export const num = (v: number) => {
  const s = Number.isInteger(v) ? v.toString() : v.toFixed(v < 1 ? 4 : 2).replace(/0+$/, "").replace(/\.$/, "");
  const [i, d] = s.split(".");
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : "");
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (m: number) => MONTHS[m];
export const dateLong = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${+d} ${MONTHS[+m - 1]} ${y}`; };
export const monthYear = (iso: string) => { const [y, m] = iso.slice(0, 10).split("-"); return `${MONTHS[+m - 1]} ${y}`; };
export const pad2 = (n: number) => String(n).padStart(2, "0");
