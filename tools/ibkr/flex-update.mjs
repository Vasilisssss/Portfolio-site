#!/usr/bin/env node
/**
 * Daily portfolio update from an Interactive Brokers Flex Query (free, no server, no login).
 *
 *   node tools/ibkr/flex-update.mjs                 fetch the statement (IBKR_FLEX_TOKEN, IBKR_FLEX_QUERY_ID) and update
 *   node tools/ibkr/flex-update.mjs --xml file.xml  use a saved statement instead of fetching
 *   --dry-run         print the result, write nothing
 *   --force           publish even if the totals or the return look odd (after you have checked them)
 *   --hold-changes    stop for review on trades, deposits and new or sold positions instead of taking them over
 *   (by default they are taken over and listed in $CHANGES_FILE when set, for a notification)
 *
 * The Flex Query (see docs/ibkr-flex-setup.md) is a Year-to-Date Activity statement with Open Positions, Cash Report,
 * Change in NAV and Net Asset Value (NAV) in Base. From it this script updates data/portfolio.json:
 *   - each holding's quantity, average cost and mark price, and the USD→base FX rate
 *   - the cash holding (base-currency ending cash)
 *   - the latest history point: NAV, cumulative net deposits, cumulative time-weighted return (chained from the last
 *     point before the statement period, so returns stay cumulative across years)
 * Nothing is estimated. Anything unexpected (an unknown position, a missing month-end, a value that does not add up)
 * stops the update: the script exits with code 2 and writes the reasons to stdout (and $GITHUB_STEP_SUMMARY).
 * Messages never contain amounts, quantities or prices: workflow logs and issues of a public repository are public.
 * Exit codes: 0 updated or nothing new, 1 error, 2 needs review.
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
// the workflow points this at the decrypted copy (data/portfolio.private.json) when the data file is encrypted
const DATA = process.env.PORTFOLIO_FILE ? join(ROOT, process.env.PORTFOLIO_FILE) : join(ROOT, "data/portfolio.json");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };

// ---------- Flex Web Service ----------
const FLEX = "https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService";
const UA = { "User-Agent": "portfolio-site-flex/1.0" };
const tag = (xml, name) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchStatement(token, queryId) {
  const send = await (await fetch(`${FLEX}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`, { headers: UA })).text();
  if (tag(send, "Status") !== "Success") throw new Error(`Flex SendRequest failed: ${tag(send, "ErrorCode") ?? ""} ${tag(send, "ErrorMessage") ?? send.slice(0, 200)}`);
  const ref = tag(send, "ReferenceCode");
  const url = tag(send, "Url") || `${FLEX}/GetStatement`;
  // the statement is generated asynchronously: poll until it is ready
  for (let i = 0, wait = 5000; i < 12; i++, wait = Math.min(wait * 1.5, 60000)) {
    await sleep(wait);
    const body = await (await fetch(`${url}?t=${encodeURIComponent(token)}&q=${encodeURIComponent(ref)}&v=3`, { headers: UA })).text();
    if (body.includes("<FlexQueryResponse")) return body;
    const code = tag(body, "ErrorCode");
    // 1019 = statement generation in progress, 1018 = too many requests: wait and retry
    if (code !== "1019" && code !== "1018") throw new Error(`Flex GetStatement failed: ${code ?? ""} ${tag(body, "ErrorMessage") ?? body.slice(0, 200)}`);
  }
  throw new Error("Flex statement was not ready after several minutes");
}

// ---------- minimal XML reading (Flex rows are attribute-only elements) ----------
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
function rows(xml, name) {
  const out = [];
  for (const m of xml.matchAll(new RegExp(`<${name}\\s([^>]*?)/?>`, "g"))) {
    const a = {};
    for (const p of m[1].matchAll(/([A-Za-z_][\w.-]*)="([^"]*)"/g)) a[p[1]] = unescape(p[2]);
    out.push(a);
  }
  return out;
}
const num = (v) => { if (v == null || v === "") return null; const n = Number(String(v).replace(/,/g, "")); return Number.isFinite(n) ? n : null; };
const isoDate = (d) => {
  if (!d) return null;
  const s = String(d).split(/[;,\s]/)[0];
  const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

export function parseStatement(xml) {
  const nav = rows(xml, "ChangeInNAV")[0];
  if (!nav) throw new Error("the statement has no Change in NAV section (add it to the Flex Query)");
  const positions = rows(xml, "OpenPosition").filter((p) => (p.levelOfDetail ?? "SUMMARY").toUpperCase() === "SUMMARY" && (p.assetCategory ?? "STK") !== "CASH");
  const cashRow = rows(xml, "CashReportCurrency").find((c) => c.currency === "BASE_SUMMARY");
  if (!cashRow) throw new Error("the statement has no Cash Report base summary (add Cash Report to the Flex Query)");
  const daily = rows(xml, "EquitySummaryByReportDateInBase").map((r) => ({ date: isoDate(r.reportDate), total: num(r.total) })).filter((r) => r.date && r.total != null);
  const st = rows(xml, "FlexStatement")[0] ?? {};
  return {
    statements: rows(xml, "FlexStatement").length,
    fromDate: isoDate(nav.fromDate ?? st.fromDate),
    toDate: isoDate(nav.toDate ?? st.toDate),
    endingValue: num(nav.endingValue),
    deposits: num(nav.depositsWithdrawals) ?? 0,
    twrRaw: num(nav.twr),
    cash: num(cashRow.endingCash),
    positions: positions.map((p) => ({
      symbol: String(p.symbol ?? "").split(/\s|@/)[0],
      description: p.description,
      subCategory: p.subCategory,
      assetCategory: p.assetCategory,
      country: p.issuerCountryCode,
      exchange: p.listingExchange,
      quantity: num(p.position),
      price: num(p.markPrice),
      avgPrice: num(p.costBasisPrice),
      currency: p.currency,
      fx: num(p.fxRateToBase),
    })),
    daily,
  };
}

// ---------- update ----------
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
// Flex statements sometimes use a different symbol from the one the site shows (same instrument, other listing name)
const ALIASES = { VCAA: "VCSHA" };
const canonical = (sym) => ALIASES[sym.toUpperCase()] ?? sym.toUpperCase();

// region of a new position, from the issuer's country (or, failing that, its exchange)
const REGION_BY_COUNTRY = {
  "North America": "US CA MX",
  Europe: "GB IE FR DE NL BE LU AT CH IT ES PT DK SE NO FI IS PL CZ HU GR CY MT SI SK HR RO BG EE LV LT JE GG IM",
  Asia: "JP HK CN TW KR SG IN ID MY TH PH VN",
  Oceania: "AU NZ",
  "Latin America": "BR AR CL CO PE UY",
  "Middle East & Africa": "IL AE SA QA ZA EG TR",
};
const REGION_BY_EXCHANGE = {
  "North America": "NYSE NASDAQ ARCA AMEX BATS IEX ISLAND TSE VENTURE PINK",
  Europe: "LSE LSEETF IBIS IBIS2 XETRA GETTEX GETTEX2 FWB SBF AEB EBS BVME BM SFB VSE WSE CPH OMXNO",
  Asia: "TSEJ SEHK SGX KSE NSE",
  Oceania: "ASX",
};
const regionOf = (country, exchange) => {
  const pick = (table, code) => code && Object.entries(table).find(([, list]) => list.split(" ").includes(String(code).toUpperCase()))?.[0];
  return pick(REGION_BY_COUNTRY, country) ?? pick(REGION_BY_EXCHANGE, exchange);
};
const monthOf = (d) => d.slice(0, 7);

export function update(pf, s, { acceptChanges = false, force = false } = {}) {
  const review = [], notes = [];
  if (s.statements > 1) {
    review.push(`IBKR sent ${s.statements} separate statements instead of one: the Flex Query's "Breakout by Day" is on. In IBKR → Performance & Reports → Flex Queries → edit portfolio-site → General Configuration, set "Breakout by Day?" to No and save.`);
    return { pf, review, notes, changed: false };
  }
  if (!s.toDate || !s.fromDate || s.endingValue == null || s.cash == null) review.push("The statement is missing its period, ending NAV or cash.");
  if (review.length) return { pf, review, notes, changed: false };

  const history0 = pf.history ?? [];
  const last0 = history0[history0.length - 1];
  // the query must cover the whole year so far, or deposits and returns cannot be cumulated
  const yearStart = `${s.toDate.slice(0, 4)}-01-01`;
  if (s.fromDate > yearStart && history0.some((p) => p.date >= yearStart && p.date < s.fromDate)) {
    review.push(`The statement covers only ${s.fromDate} → ${s.toDate}. Set the Flex Query's Period to "Year to Date" (IBKR → Performance & Reports → Flex Queries → edit portfolio-site → Delivery Configuration).`);
    return { pf, review, notes, changed: false };
  }

  // IBKR publishes a day's statement overnight: one older than what the site shows simply has nothing new yet
  if (last0 && s.toDate < last0.date) {
    notes.push(`The statement ends ${s.toDate}; the site already shows ${last0.date}. Nothing new yet.`);
    return { pf, review, notes, changed: false };
  }
  const next = structuredClone(pf);
  const history = next.history ?? [];
  const last = history[history.length - 1];

  // holdings
  const seen = new Set();
  for (const p of s.positions) {
    const h = next.holdings.find((x) => x.ticker && canonical(x.ticker) === canonical(p.symbol));
    if (!h) {
      const msg = `New position ${p.symbol}${p.description ? ` (${p.description})` : ""}.`;
      if (!acceptChanges) { review.push(`${msg} Re-run without --hold-changes to add it.`); continue; }
      // added from the statement: name, class and currency; geography and industry stay empty until set by hand
      const id = canonical(p.symbol).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const etf = /ETF|FUND/i.test(`${p.subCategory ?? ""}`);
      next.holdings.splice(next.holdings.findIndex((x) => x.assetClass === "Cash") >>> 0, 0, {
        id, name: p.description || p.symbol, ticker: canonical(p.symbol), assetClass: etf ? "ETFs" : "Stocks",
        ...(regionOf(p.country, p.exchange) ? { geography: regionOf(p.country, p.exchange) } : {}),
        quantity: p.quantity, avgPrice: p.avgPrice ?? p.price, currentPrice: p.price, currency: p.currency,
      });
      notes.push(`${msg} Added as "${id}". Set its display name, industry and a note in data/holdings.json.`);
      seen.add(id);
      if (p.currency && p.currency !== next.baseCurrency && p.fx != null) next.fx[p.currency] = p.fx;
      continue;
    }
    seen.add(h.id);
    if (p.quantity == null || p.price == null) { review.push(`${p.symbol}: quantity or mark price missing.`); continue; }
    // IBKR's statement carries more decimals than the saved data: only a real change (beyond rounding) is a trade
    const qtyChanged = Math.abs((h.quantity ?? 0) - p.quantity) > 1e-9;
    const costChanged = p.avgPrice != null && Math.abs((h.avgPrice ?? 0) - p.avgPrice) > 1e-4 * Math.max(1, Math.abs(p.avgPrice));
    if (!qtyChanged && !costChanged && p.avgPrice != null) h.avgPrice = p.avgPrice;
    if (qtyChanged || costChanged) {
      const msg = `${p.symbol}: quantity or average cost changed (a trade).`;
      if (acceptChanges) notes.push(msg); else review.push(`${msg} Re-run without --hold-changes once checked.`);
      h.quantity = p.quantity; if (p.avgPrice != null) h.avgPrice = p.avgPrice;
    }
    h.currentPrice = p.price;
    if (p.currency && p.currency !== next.baseCurrency && p.fx != null) next.fx[p.currency] = p.fx;
  }
  for (const h of [...next.holdings]) {
    if (!h.ticker || seen.has(h.id)) continue;
    const msg = `${h.ticker} is no longer in the IBKR statement (sold).`;
    if (acceptChanges) { next.holdings.splice(next.holdings.indexOf(h), 1); notes.push(`${msg} Removed.`); }
    else review.push(`${msg} Re-run without --hold-changes to remove it.`);
  }
  const cash = next.holdings.find((h) => h.assetClass === "Cash");
  if (cash) { cash.invested = round(s.cash, 2); cash.currentValue = round(s.cash, 2); }

  // the base: the last published point before the statement period (cumulative figures continue from it)
  const before = history.filter((p) => p.date < s.fromDate);
  const base = before[before.length - 1];
  const netContributions = round((base?.netContributions ?? 0) + s.deposits, 6);
  if (last && Math.abs(netContributions - last.netContributions) > 0.01) {
    const msg = `Net deposits changed (a deposit or withdrawal).`;
    if (acceptChanges) notes.push(msg); else review.push(`${msg} Re-run without --hold-changes once checked.`);
  }

  // cumulative time-weighted return. Flex reports TWR either as a fraction or in percent: take the reading that
  // continues the published series (daily moves are small; the two readings differ by a factor of 100)
  let twr;
  if (s.twrRaw != null) {
    const chain = (r) => round((1 + (base?.twr ?? 0)) * (1 + r) - 1, 8);
    const a = chain(s.twrRaw), b = chain(s.twrRaw / 100);
    twr = last?.twr == null ? (Math.abs(s.twrRaw) > 1.5 ? b : a) : (Math.abs(a - last.twr) <= Math.abs(b - last.twr) ? a : b);
    if (last?.twr != null && Math.abs(twr - last.twr) > 0.25) (force ? notes : review).push("Time-weighted return would jump by more than 25 percentage points.");
  } else review.push("The statement has no TWR in Change in NAV (add the TWR field to the Flex Query).");

  // month-end: when a new month has begun, the previous latest point must be that month's last business day
  if (last && monthOf(s.toDate) > monthOf(last.date)) {
    const monthRows = s.daily.filter((r) => monthOf(r.date) === monthOf(last.date));
    const end = monthRows[monthRows.length - 1];
    if (end && end.date !== last.date) {
      const msg = `The ${monthOf(last.date)} month-end point is ${last.date}, but the month's last business day is ${end.date} (a daily run was missed).`;
      // its return cannot be rebuilt from a year-to-date statement; accepting keeps the last published point as the month-end
      if (acceptChanges) notes.push(`${msg} Kept ${last.date} as the month-end.`);
      else review.push(`${msg} Re-run without --hold-changes to keep ${last.date} as that month's point.`);
    }
  }

  // sanity: positions + cash should add up to the statement's NAV
  const total = next.holdings.reduce((t, h) => t + (h.currentValue ?? (h.quantity ?? 0) * (h.currentPrice ?? 0) * (next.fx[h.currency] ?? NaN)), 0);
  if (!(Math.abs(total - s.endingValue) <= 0.02 * Math.max(1, Math.abs(s.endingValue)))) (force ? notes : review).push(`Holdings do not add up to the statement's NAV (off by ${Math.abs(round((total / s.endingValue - 1) * 100, 1))}%).`);

  const point = { date: s.toDate, value: round(s.endingValue, 6), netContributions, ...(twr != null ? { twr } : {}) };
  // within a month the latest point moves forward; once a month is over, its last point stays as the month-end
  if (last && monthOf(last.date) === monthOf(s.toDate)) history[history.length - 1] = point; else history.push(point);
  next.history = history;
  next.asOf = s.toDate;
  const changed = JSON.stringify(next) !== JSON.stringify(pf);
  return { pf: next, review, notes, changed, total, point };
}

// ---------- main ----------
async function main() {
  const xml = opt("--xml") ? readFileSync(opt("--xml"), "utf8") : await (async () => {
    const t = process.env.IBKR_FLEX_TOKEN, q = process.env.IBKR_FLEX_QUERY_ID;
    if (!t || !q) { console.log("IBKR_FLEX_TOKEN / IBKR_FLEX_QUERY_ID are not set: nothing to do (see docs/ibkr-flex-setup.md)."); process.exit(0); }
    return fetchStatement(t, q);
  })();
  const pf = JSON.parse(readFileSync(DATA, "utf8"));
  // the report's structure (dates and counts only, never amounts): to see what IBKR sent when something looks off
  {
    const st = rows(xml, "FlexStatement");
    const eq = rows(xml, "EquitySummaryByReportDateInBase").map((r) => r.reportDate).filter(Boolean);
    console.log(`Report structure: ${st.length} statement(s)${st.length ? ` (${st[0].fromDate}→${st[0].toDate}${st.length > 1 ? ` … ${st[st.length - 1].fromDate}→${st[st.length - 1].toDate}` : ""}, period ${st[0].period ?? "?"}, generated ${st[st.length - 1].whenGenerated ?? "?"})` : ""}, open positions ${rows(xml, "OpenPosition").length}, daily NAV rows ${eq.length}.`);
  }
  const s = parseStatement(xml);
  // fully automatic: trades, deposits and new or sold positions are taken over; only anomalies stop the update
  const r = update(pf, s, {
    acceptChanges: !(flag("--hold-changes") || process.env.HOLD_CHANGES === "true"),
    // after checking an anomaly (totals that do not add up, a large jump in return): publish anyway
    force: flag("--force") || process.env.FORCE === "true",
  });
  const lines = [];
  // when IBKR publishes: each run records what day the report covers; the first run that shows a new day bounds it
  const lastPublished = pf.asOf ?? "";
  const fresh = s.toDate > lastPublished ? "new" : s.toDate === lastPublished ? "same day" : "not yet";
  lines.push(`Checked at ${new Date().toISOString().slice(11, 16)} UTC — IBKR report covers up to ${s.toDate} (${fresh}; the site shows ${lastPublished || "—"}).`);
  lines.push(`Statement ${s.fromDate} → ${s.toDate}.`);
  lines.push(...r.notes.map((n) => `- ${n}`));
  if (r.review.length) lines.unshift("NEEDS REVIEW — nothing was published:", ...r.review.map((x) => `- ${x}`), "");
  else lines.push(r.changed ? `Updated the portfolio data (as of ${r.pf.asOf}).` : "No new data.");
  const text = lines.join("\n");
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  if (r.review.length) process.exit(2);
  // the moment this update published a change: shown on the front page as "Updated …"
  if (r.changed) r.pf.updatedAt = new Date().toISOString().slice(0, 19) + "Z";
  if (r.changed && !flag("--dry-run")) writeFileSync(DATA, `${JSON.stringify(r.pf, null, 2)}\n`);
  // what changed in the portfolio (no amounts), for the workflow's notification
  if (r.changed && r.notes.length && process.env.CHANGES_FILE && !flag("--dry-run"))
    writeFileSync(process.env.CHANGES_FILE, `Published with the IBKR statement of ${r.pf.asOf}:\n\n${r.notes.map((n) => `- ${n}`).join("\n")}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(String(e?.message ?? e)); process.exit(1); });
