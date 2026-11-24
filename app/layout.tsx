import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/profile";
import { navItems } from "@/lib/nav";
import SmoothScroll from "@/components/chrome/SmoothScroll";
import Loader from "@/components/chrome/Loader";
import Cursor from "@/components/chrome/Cursor";
import Nav from "@/components/chrome/Nav";
import Footer from "@/components/sections/Footer";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(profile.url),
  title: { default: profile.siteTitle, template: `%s · ${profile.name}` },
  description: profile.hero.body,
  openGraph: { type: "website", title: profile.siteTitle, description: profile.hero.body, url: profile.url },
  twitter: { card: "summary_large_image" },
  // preview builds (SITE_PREVIEW=1) stay out of search engines
  robots: process.env.SITE_PREVIEW === "1" ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#08090A", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-ice-deep focus:px-4 focus:py-3 focus:text-black">Skip to content</a>
        <SmoothScroll />
        <Loader line={profile.hero.lines.join(" ")} />
        <Nav name={profile.name} items={navItems()} email={profile.email} closing={profile.closing.join(" ")} />
        <main id="main" className="relative z-[1] bg-transparent">{children}</main>
        <Footer />
        <Cursor />
        {process.env.SITE_PREVIEW === "1" && (
          <div className="pointer-events-none fixed left-4 top-[88px] z-[60] rounded-full border border-ice-deep/40 bg-black/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ice-deep backdrop-blur">Preview · not live</div>
        )}
      </body>
    </html>
  );
}
