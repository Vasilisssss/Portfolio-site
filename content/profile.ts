/**
 * PROFILE — your words. Bracketed text is a placeholder: nothing here describes you until you write it.
 * Strategy statements marked `draft: true` show a small "Draft" tag on the site until you rewrite them.
 */
export const profile = {
  name: "Vasilis Mavroudes",
  /** shown in the browser tab and search results */
  siteTitle: "Retail Investor - Vasilis Mavroudes",
  url: process.env.SITE_URL || "https://vasilisssss.github.io/Portfolio-site",
  email: "vmavro01@gmail.com",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/vasilismavroudes1997/" },
  ],

  hero: {
    eyebrow: "Investor · CFA Level III Candidate",
    lines: ["My capital,", "in the long run."],
    body: "A finance professional with experience across risk and investment analysis, portfolio performance and financial research, alongside continued professional development through the CFA Program.",
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
    /**
     * Downloads under the principles. Put each file in public/ at the path given (e.g. public/documents/…pdf): its card
     * becomes a download link on the next deploy. Until then the card reads "In preparation".
     */
    documents: [
      {
        title: "Investment Policy Statement",
        body: "My objectives, constraints, risk tolerance and the rules this portfolio follows.",
        file: "documents/investment-policy-statement.pdf",
        format: "PDF",
      },
      {
        title: "Portfolio model",
        body: "The spreadsheet behind the portfolio: the allocation, the assumptions and the analysis.",
        file: "documents/portfolio-model.xlsx",
        format: "Excel",
      },
    ],
  },

  about: {
    intro: "A finance professional with an interest in investment research, portfolio analysis and long-term decision-making.",
    approach: "A considered approach grounded in research, valuation, risk awareness and continuous learning.",
    vision: "To keep developing sound judgement through experience, study and disciplined analysis.",
    started: "—",
  },

  closing: ["Think long term.", "Build with conviction."],
  disclaimer: "This is a personal record of my own investments, shared for transparency. It is not investment advice, a recommendation or an offer of any kind. Past performance does not predict future results.",
};
