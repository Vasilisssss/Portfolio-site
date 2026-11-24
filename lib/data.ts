import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PortfolioData } from "./types";
import { ASSET_CLASSES } from "./types";
import { samplePortfolio } from "@/content/sample-portfolio";

/**
 * Data source, in order of precedence (build time only):
 *  1. data/portfolio.private.json — git-ignored local/CI override (CI writes it from the PORTFOLIO_JSON secret)
 *  2. data/portfolio.json         — committed portfolio data (public repository!)
 *  3. content/sample-portfolio.ts — labelled development sample
 * data/holdings.json (public, no amounts) then overrides each holding's descriptive fields — name, class, region,
 * industry, note, purchase date, visibility — so they can be edited on GitHub while the data itself stays encrypted.
 */
const DESCRIPTIVE = ["name", "assetClass", "geography", "industry", "note", "purchaseDate", "public"] as const;

function withDescriptions<T extends { holdings?: Record<string, unknown>[] }>(raw: T): T {
  const file = path.join(process.cwd(), "data", "holdings.json");
  if (!fs.existsSync(file)) return raw;
  const meta = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Record<string, unknown>>;
  return {
    ...raw,
    holdings: (raw.holdings ?? []).map((h) => {
      const m = meta[String(h.id)];
      if (!m || typeof m !== "object") return h;
      return { ...h, ...Object.fromEntries(DESCRIPTIVE.filter((k) => m[k] !== undefined).map((k) => [k, m[k]])) };
    }),
  };
}
let cached: PortfolioData | null = null;

function validate(raw: Omit<PortfolioData, "sample">, file: string): PortfolioData {
  const ids = new Set<string>();
  for (const h of raw.holdings ?? []) {
    if (!ASSET_CLASSES.includes(h.assetClass)) throw new Error(`${file}: holding "${h.id}" has unknown assetClass "${h.assetClass}"`);
    if (!/^[a-z0-9-]+$/.test(h.id)) throw new Error(`${file}: holding id "${h.id}" must be lowercase letters, numbers and dashes`);
    if (ids.has(h.id)) throw new Error(`${file}: duplicate holding id "${h.id}"`);
    ids.add(h.id);
    if (h.currency !== raw.baseCurrency && raw.fx?.[h.currency] == null) throw new Error(`${file}: no fx rate for ${h.currency}`);
  }
  const hist = [...(raw.history ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  return { sample: false, source: raw.source, baseCurrency: raw.baseCurrency ?? "EUR", fx: raw.fx ?? {}, asOf: raw.asOf, holdings: raw.holdings ?? [], history: hist };
}

export function loadPortfolio(): PortfolioData {
  if (cached) return cached;
  for (const name of ["portfolio.private.json", "portfolio.json"]) {
    const file = path.join(process.cwd(), "data", name);
    if (fs.existsSync(file)) {
      cached = validate(withDescriptions(JSON.parse(fs.readFileSync(file, "utf8"))), `data/${name}`);
      return cached;
    }
  }
  cached = samplePortfolio;
  return cached;
}
