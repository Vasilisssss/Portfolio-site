import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { site } from "@/content/site";
import { portfolio } from "@/content/portfolio";
import { insights } from "@/content/insights";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    ...portfolio.investments.map((i) => ({ url: `${site.url}/portfolio/${i.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...insights.map((a) => ({ url: `${site.url}/insights/${a.slug}`, lastModified: a.date, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
