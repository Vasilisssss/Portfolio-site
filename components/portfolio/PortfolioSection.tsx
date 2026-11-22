import { portfolio } from "@/content/portfolio";
import SectionHead from "@/components/ui/SectionHead";
import SampleBadge from "@/components/ui/SampleBadge";
import InvestmentCard from "./InvestmentCard";

export default function PortfolioSection() {
  return (
    <section id="portfolio" aria-labelledby="portfolio-title" className="container-x relative z-[2] pb-20 pt-32">
      <div className="mb-[72px]">
        <SectionHead
          index="I"
          eyebrow="The portfolio"
          aside={
            <div className="flex max-w-[340px] flex-col gap-4">
              <SampleBadge />
              <p className="text-sm leading-[1.7] text-silver">
                Every figure on this page is sample data for design purposes. Replace it in <code className="text-ivory-dim">content/portfolio.ts</code> with verified holdings before publishing.
              </p>
            </div>
          }
        >
          <span id="portfolio-title">Seven disciplines, <em>one</em> balance sheet.</span>
        </SectionHead>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {portfolio.investments.map((inv, i) => (
          <div key={inv.slug} className={`flex lg:[margin-top:var(--o)] ${inv.layout.span === 7 ? "lg:col-span-7" : inv.layout.span === 5 ? "lg:col-span-5" : "lg:col-span-4"}`} style={{ ["--o" as string]: `${inv.layout.offset}px` }}>
            <InvestmentCard inv={inv} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
