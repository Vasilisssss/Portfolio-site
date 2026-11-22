import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PortfolioData } from "./types";
import { ASSET_CLASSES } from "./types";
import { samplePortfolio } from "@/content/sample-portfolio";

/**
 * Loads data/portfolio.private.json when present (your real data, git-ignored),
 * otherwise the clearly-labelled sample data. Runs at build time only.
 */
let cached: PortfolioData | null = null;

export function loadPortfolio(): PortfolioData {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "portfolio.private.json");
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Omit<PortfolioData, "sample">;
    for (const h of raw.holdings ?? []) {
      if (!ASSET_CLASSES.includes(h.assetClass)) throw new Error(`Holding "${h.id}": unknown assetClass "${h.assetClass}"`);
      if (!/^[a-z0-9-]+$/.test(h.id)) throw new Error(`Holding id "${h.id}" must be lowercase letters, numbers and dashes`);
    }
    cached = { sample: false, baseCurrency: raw.baseCurrency ?? "USD", fx: raw.fx ?? {}, asOf: raw.asOf, holdings: raw.holdings ?? [], history: raw.history ?? [] };
  } else {
    cached = samplePortfolio;
  }
  return cached;
}
