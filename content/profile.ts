/**
 * PROFILE — your words. Bracketed text is a placeholder: nothing here describes you until you write it.
 * Strategy statements marked `draft: true` show a small "Draft" tag on the site until you rewrite them.
 */
export const profile = {
  name: "Vasilis Mavroudes",
  /** shown in the browser tab and search results */
  siteTitle: "Vasilis Mavroudes — Investor & CFA Level III Candidate",
  url: process.env.SITE_URL || "https://vasilisssss.github.io/Portfolio-site",
  email: "vmavro01@gmail.com",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/vasilismavroudes1997/" },
  ],

  hero: {
    eyebrow: "Investor · CFA Level III Candidate",
    lines: ["My capital,", "in the long run."],
    body: "Risk Analyst at Argus Management Ltd., with previous experience in portfolio performance at Albourne. A finance professional documenting investment research, portfolio thinking and a continued commitment to the CFA Program.",
  },

  strategy: {
    draft: false,
    headline: ["A broader", "lens.", "A disciplined", "process."],
    italicFrom: 1,
    intro: "My investment perspective brings together fundamental research, valuation, portfolio construction, macro context and quantitative analysis. Different lenses help frame a decision; risk and evidence remain central to evaluating it.",
    principles: [
      { title: "Fundamental research", body: "Understand the business, its economics and the drivers behind its long-term prospects." },
      { title: "Valuation", body: "Assess what an investment may be worth, and consider the relationship between price, expectations and uncertainty." },
      { title: "Portfolio construction", body: "Consider each position in the context of the wider portfolio, its exposures and its contribution to overall risk." },
      { title: "Risk perspective", body: "Look beyond expected return to consider downside, concentration, liquidity and the assumptions that could prove wrong." },
      { title: "Macro context", body: "Take account of the economic and market environment without losing sight of the characteristics of the underlying investment." },
      { title: "Quantitative evidence", body: "Use data and analytical methods to test assumptions, identify patterns and support—not replace—judgement." },
    ],
  },
