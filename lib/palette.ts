/**
 * One colour per asset class for the dark theme: acid lime is reserved for the largest, then soft white,
 * greys and a muted olive, so neighbours always differ in lightness. Shared by 3D, charts and chips.
 */
const CLASS_COLORS: Record<string, string> = {
  Stocks: "#d7ff3f",
  ETFs: "#f3f2ed",
  Cryptocurrency: "#9fbf2c",
  "Real Estate": "#7d8380",
  Bonds: "#c8c9c3",
  Cash: "#898d8c",
  "Precious Metals": "#e9f7b0",
  "Private Investments": "#5a5f64",
  "Other Assets": "#a7aaa6",
};
export const classColor = (k: string) => CLASS_COLORS[k] ?? "#a7aaa6";

/** Categorical ramp for breakdowns that are not asset classes (geography, industry, currency, investments). */
export const RAMP = ["#d7ff3f", "#f3f2ed", "#898d8c", "#9fbf2c", "#c8c9c3", "#5a5f64", "#e9f7b0", "#7d8380", "#b6d63a", "#3d4146", "#dcdcd6", "#6c7a2a"];
export const UNDISCLOSED = "#2a2e33";
