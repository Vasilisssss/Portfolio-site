/**
 * One colour per asset class for the dark theme, all drawn from the site's champagne / graphite system:
 * champagne is reserved for the largest class, then ivory, greys and darker champagne tints, so neighbours always
 * differ in lightness. Shared by charts and chips. Plain 6-digit hex (components append alpha to these).
 */
const CLASS_COLORS: Record<string, string> = {
  Stocks: "#d9c09b",
  ETFs: "#f3f2ed",
  Cryptocurrency: "#9c8a6f",
  "Real Estate": "#7d8380",
  Bonds: "#c8c9c3",
  Cash: "#898d8c",
  "Precious Metals": "#e8d9c2",
  "Private Investments": "#5a5f64",
  "Other Assets": "#a7aaa6",
};
export const classColor = (k: string) => CLASS_COLORS[k] ?? "#a7aaa6";

/** Categorical ramp for breakdowns that are not asset classes (geography, industry, currency, investments). */
export const RAMP = ["#d9c09b", "#f3f2ed", "#898d8c", "#9c8a6f", "#c8c9c3", "#5a5f64", "#e8d9c2", "#7d8380", "#b8a281", "#3d4146", "#dcdcd6", "#6f6252"];
export const UNDISCLOSED = "#2a2e33";
