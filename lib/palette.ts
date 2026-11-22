/**
 * One colour per asset class — pastel blue, lavender, aqua, blush and pearl, each with a distinct
 * lightness so neighbours stay distinguishable. Shared by the 3D scene, charts and chips.
 */
const CLASS_COLORS: Record<string, string> = {
  Stocks: "#7fb3e0",
  ETFs: "#a99ee8",
  Cryptocurrency: "#5a52a6",
  "Real Estate": "#9fd6c8",
  Bonds: "#c3dcf2",
  Cash: "#e9eef5",
  "Precious Metals": "#e7b8d4",
  "Private Investments": "#3f5f86",
  "Other Assets": "#b9c4d3",
};
export const classColor = (k: string) => CLASS_COLORS[k] ?? "#b9c4d3";

/** Categorical ramp for breakdowns that are not asset classes (geography, industry, currency, investments). */
export const RAMP = ["#7fb3e0", "#a99ee8", "#9fd6c8", "#3f5f86", "#e7b8d4", "#c3dcf2", "#5a52a6", "#b9c4d3", "#dcd6fb", "#2e6a99", "#d5f2ea", "#3a4252"];
export const UNDISCLOSED = "#dde3ec";
