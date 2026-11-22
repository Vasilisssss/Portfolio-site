/**
 * PRIVACY — you decide what the public site reveals.
 *
 * Everything here is applied on the server at build time (lib/public.ts).
 * Anything you hide is removed before the page is generated: it is not in the
 * HTML, not in the JavaScript, and not in the page data sent to the browser.
 */
export const privacy = {
  /** false → no currency amounts anywhere (values, invested, P/L, prices). Percentages and returns stay. */
  showAmounts: true,
  /** false → hide quantities / units held */
  showQuantities: true,
  /** false → hide average purchase and current prices */
  showPrices: true,
  /** false → hide purchase dates (shows year only when true and dates exist) */
  showPurchaseDates: true,
  /** false → hide individual holdings entirely; only asset-class level allocation and totals remain */
  showHoldings: true,
  /**
   * "all"      → every holding not marked `public: false`
   * "selected" → only the ids listed in `selected`
   */
  holdingsMode: "all" as "all" | "selected",
  selected: [] as string[],
  /** turn whole sections on or off */
  sections: {
    overview: true,
    investments: true,
    allocation: true,
    performance: true,
    strategy: true,
    journal: true,
    about: true,
  },
};

export type SectionKey = keyof typeof privacy.sections;
