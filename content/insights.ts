/** SAMPLE ARTICLES — replace with your own commentary. */
export interface Insight {
  slug: string;
  tag: string;
  title: string;
  dek: string;
  date: string;
  readMinutes: number;
  body: string[];
}

export const insightsAreSamples = true;

export const insights: Insight[] = [
  { slug: "long-arc-of-real-rates", tag: "Macro", title: "The long arc of real interest rates", dek: "Why the end of free money changes what “cheap” means — and which assets still earn their keep.", date: "2026-11-04", readMinutes: 8,
    body: ["[Article body. Write your full macro commentary here.]", "[Second paragraph — what it means for portfolio positioning.]"] },
  { slug: "quality-compounds-quietly", tag: "Equities", title: "Quality compounds quietly", dek: "The case for owning fewer, better businesses for longer.", date: "2026-10-12", readMinutes: 6,
    body: ["[Article body.]", "[Second paragraph.]"] },
  { slug: "private-markets-after-the-repricing", tag: "Private markets", title: "Private markets after the repricing", dek: "Where discipline is being rewarded in the secondary market.", date: "2026-09-18", readMinutes: 7,
    body: ["[Article body.]", "[Second paragraph.]"] },
  { slug: "liquidity-as-an-option", tag: "Strategy", title: "Notes on liquidity as an option", dek: "Cash is not a position. It is the right to take one later.", date: "2026-08-21", readMinutes: 4,
    body: ["[Article body.]", "[Second paragraph.]"] },
  { slug: "energy-transition-second-derivative", tag: "Sector", title: "Energy transition: the second derivative", dek: "The opportunity has moved from generation to the grid.", date: "2026-07-09", readMinutes: 9,
    body: ["[Article body.]", "[Second paragraph.]"] },
];

export const getInsight = (slug: string) => insights.find((i) => i.slug === slug);
