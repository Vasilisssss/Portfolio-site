import { privacy } from "@/content/privacy";

// next/link adds the basePath itself: hrefs here are root-relative (adding it again produced /Portfolio-site/Portfolio-site/…)
const ALL = [
  { key: "overview", label: "Overview", href: "/#overview" },
  { key: "investments", label: "Investments", href: "/#investments" },
  { key: "allocation", label: "Allocation", href: "/#allocation" },
  { key: "performance", label: "Performance", href: "/#performance" },
  { key: "strategy", label: "Strategy", href: "/#strategy" },
  { key: "journal", label: "Journal", href: "/#journal" },
  { key: "experience", label: "Experience", href: "/#experience" },
  { key: "about", label: "About", href: "/#about" },
] as const;

/** Only sections switched on in content/privacy.ts appear in navigation. */
export const navItems = () =>
  ALL.filter((n) => n.key !== "journal" && privacy.sections[n.key] && (n.key !== "investments" || privacy.showHoldings)).map(({ label, href }) => ({ label, href }));
