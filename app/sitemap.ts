import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { profile } from "@/content/profile";
import { privacy } from "@/content/privacy";
import { getPublicView } from "@/lib/public";

/** Lists only pages the privacy settings make public. */
export default function sitemap(): MetadataRoute.Sitemap {
  const view = getPublicView();
  return [
    { url: profile.url, changeFrequency: "weekly", priority: 1 },
    ...(view.sections.investments ? view.holdings.map((h) => ({ url: `${profile.url}/investments/${h.id}/`, changeFrequency: "weekly" as const, priority: 0.7 })) : []),
  ];
}
