import Hero from "@/components/hero/Hero";
import PortfolioSection from "@/components/portfolio/PortfolioSection";
import AnalyticsSection from "@/components/analytics/AnalyticsSection";
import Philosophy from "@/components/sections/Philosophy";
import Insights from "@/components/sections/Insights";
import About from "@/components/sections/About";
import { site } from "@/content/site";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: `${site.firm} ${site.firmSuffix}`,
    description: site.hero.body,
    url: site.url,
    email: site.email,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <PortfolioSection />
      <AnalyticsSection />
      <Philosophy />
      <Insights />
      <About />
    </>
  );
}
