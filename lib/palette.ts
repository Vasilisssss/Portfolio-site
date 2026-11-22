/** One colour per asset class — pearl / ice / lavender / champagne / graphite family. Shared by 3D, charts and chips. */
const CLASS_COLORS: Record<string, string> = {
  Stocks: "#8fb6d1",
  ETFs: "#b3a8e2",
  Cryptocurrency: "#7c70b8",
  "Real Estate": "#d6bf8f",
  Bonds: "#c7dcea",
  Cash: "#e8e4da",
  "Precious Metals": "#c9a96a",
  "Private Investments": "#5b5e68",
  "Other Assets": "#a9adb5",
};
export const classColor = (k: string) => CLASS_COLORS[k] ?? "#a9adb5";

/** General categorical ramp for breakdowns that are not asset classes (geography, industry, currency, investments). */
export const RAMP = ["#8fb6d1", "#b3a8e2", "#d6bf8f", "#5b5e68", "#c7dcea", "#7c70b8", "#c9a96a", "#a9adb5", "#dcd6f0", "#3f6f8f", "#efe3c8", "#44474f"];
export const UNDISCLOSED = "#d9d6cf";
