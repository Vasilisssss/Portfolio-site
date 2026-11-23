import { privacy } from "@/content/privacy";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";\n\nconst ALL = [
  { key: "overview", label: "Overview", href: `${basePath}/#overview` },
  { key: "investments", label: "Investments", href: `${basePath}/#investments` },
  { key: "allocation", label: "Allocation", href: `${basePath}/#allocation` },
  { key: "performance", label: "Performance", href: `${basePath}/#performance` },
  { key: "strategy", label: "Strategy", href: `${basePath}/#strategy` },
  { key: "journal", label: "Journal", href: "/#journal" },
  { key: "experience", label: "Experience", href: `${basePath}/#experience` },
  { key: "about", label: "About", href: `${basePath}/#about` },
] as const;

/** Only sections switched on in content/privacy.ts appear in navigation. */
export const navItems = () =>
  ALL.filter((n) => n.key !== "journal" && privacy.sections[n.key] && (n.key !== "investments" || privacy.showHoldings)).map(({ label, href }) => ({ label, href }));
