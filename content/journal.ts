import type { JournalEntry } from "@/lib/types";

/** Your market journal. Entries with `sample: true` are development placeholders — delete them when you add your own. */
export const journal: JournalEntry[] = [
  { slug: "sample-why-i-rebalanced", kind: "Decision", title: "Why I rebalanced this quarter", dek: "Sample entry — the reasoning behind a portfolio change, written at the time.", date: "2026-10-28", holdings: ["sample-world-equity", "cash-reserve"], sample: true,
    body: ["[Write what you changed, what you expected, and what would prove you wrong.]", "[Come back later and add what actually happened.]"] },
  { slug: "sample-rates-observation", kind: "Observation", title: "Notes on interest rates and cash", dek: "Sample entry — a market observation and what it means for my own positioning.", date: "2026-09-14", holdings: ["cash-reserve", "sample-treasury-2029"], sample: true,
    body: ["[Your observation.]", "[What it means for the portfolio.]"] },
  { slug: "sample-research-emerging-markets", kind: "Research", title: "Research: emerging markets exposure", dek: "Sample entry — research notes on a part of the portfolio.", date: "2026-07-02", holdings: ["sample-emerging-markets"], sample: true,
    body: ["[Research notes.]"] },
  { slug: "sample-lesson-selling-early", kind: "Lesson", title: "Lesson: selling too early", dek: "Sample entry — a mistake and what I changed afterwards.", date: "2026-05-19", sample: true,
    body: ["[What happened, and the rule you adopted because of it.]"] },
  { slug: "sample-portfolio-update-h1", kind: "Portfolio update", title: "Half-year portfolio update", dek: "Sample entry — a periodic look at the whole portfolio.", date: "2026-07-01", sample: true,
    body: ["[Summary of the period.]"] },
];

export const getEntry = (slug: string) => journal.find((e) => e.slug === slug);
