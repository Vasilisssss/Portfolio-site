import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";
import SmoothScroll from "@/components/chrome/SmoothScroll";
import Loader from "@/components/chrome/Loader";
import Cursor from "@/components/chrome/Cursor";
import Grain from "@/components/chrome/Grain";
import Nav from "@/components/chrome/Nav";
import Footer from "@/components/sections/Footer";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.firm} ${site.firmSuffix} — Capital with purpose`, template: `%s · ${site.firm} ${site.firmSuffix}` },
  description: site.hero.body,
  openGraph: { type: "website", title: `${site.firm} ${site.firmSuffix}`, description: site.hero.body, url: site.url },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0A0B0D", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-ivory focus:px-4 focus:py-3 focus:text-ink">Skip to content</a>
        <SmoothScroll />
        <Loader />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <Grain />
        <Cursor />
      </body>
    </html>
  );
}
