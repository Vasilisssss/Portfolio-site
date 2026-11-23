import type { JournalEntry } from "@/lib/types";

/**
 * Your market journal.
 * Kept intentionally empty until you provide real research notes or investment decisions.
 * Do not publish sample entries as if they were your own.
 */
export const journal: JournalEntry[] = [];

export const getEntry = (slug: string) => journal.find((e) => e.slug === slug);
