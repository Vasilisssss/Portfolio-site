/**
 * Site-wide copy and settings. Replace the bracketed placeholders.
 * Everything a content editor needs to change lives in /content.
 */
export const site = {
  firm: "[Your Firm]",
  firmSuffix: "Capital",
  founded: "[YEAR]",
  email: "hello@example.com",
  address: ["[Office address]", "[City, Country]"],
  url: "https://example.com",
  currency: "USD" as const,
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "X", href: "https://x.com" },
  ],
  nav: [
    { label: "Home", href: "/#top" },
    { label: "Portfolio", href: "/#portfolio" },
    { label: "Strategy", href: "/#strategy" },
    { label: "Insights", href: "/#insights" },
    { label: "About", href: "/#about" },
    { label: "Contact", href: "/#contact" },
  ],
  hero: {
    eyebrow: "A private investment office",
    lines: ["Capital with purpose.", "Vision beyond markets."],
    body: "A considered approach to investing, building enduring value, and identifying opportunities across a changing global landscape.",
    primary: { label: "Explore the portfolio", href: "/#portfolio" },
    secondary: { label: "Investment philosophy", href: "/#strategy" },
  },
  closing: ["Think long term.", "Build with conviction."],
  disclaimer:
    "For information only. Nothing on this site is an offer, solicitation or investment advice. Figures shown are illustrative sample data. Past performance is not a reliable indicator of future results; the value of investments can fall as well as rise.",
};

export const philosophy = {
  headline: ["We", "don’t", "chase", "the", "market.", "We", "study", "the", "future."],
  italicFrom: 5,
  intro: "Seven commitments that decide what we own, how much, and for how long.",
  principles: [
    { title: "Capital preservation", body: "The first rule is to avoid permanent loss. We would rather miss a rally than risk the base we compound from." },
    { title: "Long-term value creation", body: "We underwrite businesses and assets for what they will be worth in ten years, not next quarter." },
    { title: "Strategic diversification", body: "Seven disciplines with different drivers, so no single outcome decides our future." },
    { title: "Disciplined risk management", body: "Position sizing, liquidity and leverage limits are set before conviction, never after." },
    { title: "Fundamental research", body: "Primary work, first-hand diligence and our own models. Consensus is a starting point, not a conclusion." },
    { title: "Asymmetric opportunities", body: "We look for situations where the downside is understood and bounded, and the upside is not." },
    { title: "Sustainable growth", body: "Returns that depend on fragile people, balance sheets or planets are not returns we want." },
  ],
};

export const about = {
  background: "[Your background: years in markets, previous roles, and how the office came to be.]",
  statement: ["A private investment office built for ", "decades,", " not quarters — allocating our own capital with the patience of a long-term owner."],
  blocks: [
    { label: "Vision", text: "To compound capital responsibly across generations." },
    { label: "Mission", text: "Own exceptional assets, at sensible prices, for as long as they stay exceptional." },
  ],
  expertise: ["Global public equities", "Private capital & co-investment", "Real assets & property", "Macro & risk management"],
  objectives: ["Preserve real purchasing power", "Grow capital above inflation over full cycles", "Keep liquidity to act when others cannot"],
};
