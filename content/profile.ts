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
    body: "A personal investment portfolio and professional profile — documenting the companies I invest in, the principles behind my decisions and my journey as a CFA Level III candidate.",
  },

  strategy: {
    draft: true,
    headline: ["I", "don’t", "chase", "the", "market.", "I", "study", "the", "future."],
    italicFrom: 5,
    intro: "How I think about money, risk and time. Rewrite every line below in your own words.",
    principles: [
      { title: "Time is my edge", body: "[Draft] I only invest money I won’t need for years, so short-term prices don’t force my hand." },
      { title: "Avoid the big loss", body: "[Draft] I size positions so that no single mistake can set me back more than I can recover from." },
      { title: "Own what I understand", body: "[Draft] If I can’t explain why I own something in two sentences, I don’t own it." },
      { title: "Keep dry powder", body: "[Draft] Cash is an option on future opportunities, not a wasted asset." },
      { title: "Automate the boring part", body: "[Draft] Regular contributions happen on schedule; my judgement goes into the rest." },
      { title: "Write it down", body: "[Draft] Every decision gets a journal entry, so I can learn from my reasoning, not just my results." },
    ],
  },

  about: {
    intro: "I’m Vasilis Mavroudes — an investor and CFA Level III candidate, documenting my investment portfolio and professional journey.",
    approach: "An evolving, research-led approach to understanding businesses, valuation and risk.",
    vision: "Build lasting investment knowledge, sound judgement and a disciplined process over time.",
    started: "CFA Program · Level III Candidate",
  },

  closing: ["Think long term.", "Build with conviction."],
  disclaimer:
    "This is a personal record of my own investments, shared for transparency. It is not investment advice, a recommendation or an offer of any kind. Past performance does not predict future results.",
};
