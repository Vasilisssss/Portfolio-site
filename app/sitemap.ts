import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { profile } from "@/content/profile";
import { privacy } from "@/content/privacy";
import { getPublicView } from "@/lib/public";
import { journal } from "@/content/journal";

/** Lists only pages the privacy settings make public. */
export default function sitemap(): MetadataRoute.Sitemap {
  const view = getPublicView();
  return [
    { url: profile.url, changeFrequency: "weekly", priority: 1 },
    ...(view.sections.investments ? view.holdings.map((h) => ({ url: `${profile.url}/investments/${h.id}/`, changeFrequency: "weekly" as const, priority: 0.7 })) : []),
    ...(privacy.sections.journal ? journal.map((e) => ({ url: `${profile.url}/journal/${e.slug}/`, lastModified: e.date, changeFrequency: "yearly" as const, priority: 0.6 })) : []),
  ];
}
