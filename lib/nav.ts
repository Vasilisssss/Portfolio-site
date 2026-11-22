import { privacy } from "@/content/privacy";

const ALL = [
  { key: "overview", label: "Overview", href: "/#overview" },
  { key: "investments", label: "Investments", href: "/#investments" },
  { key: "allocation", label: "Allocation", href: "/#allocation" },
  { key: "performance", label: "Performance", href: "/#performance" },
  { key: "strategy", label: "Strategy", href: "/#strategy" },
  { key: "journal", label: "Journal", href: "/#journal" },
  { key: "about", label: "About", href: "/#about" },
] as const;

/** Only sections switched on in content/privacy.ts appear in navigation. */
export const navItems = () =>
  ALL.filter((n) => privacy.sections[n.key] && (n.key !== "investments" || privacy.showHoldings)).map(({ label, href }) => ({ label, href }));
