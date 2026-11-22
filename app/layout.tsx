import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { profile } from "@/content/profile";
import { navItems } from "@/lib/nav";
import SmoothScroll from "@/components/chrome/SmoothScroll";
import Loader from "@/components/chrome/Loader";
import Cursor from "@/components/chrome/Cursor";
import Grain from "@/components/chrome/Grain";
import Nav from "@/components/chrome/Nav";
import Footer from "@/components/sections/Footer";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(profile.url),
  title: { default: profile.siteTitle, template: `%s · ${profile.name}` },
  description: profile.hero.body,
  openGraph: { type: "website", title: profile.siteTitle, description: profile.hero.body, url: profile.url },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#F6F4EF", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-graphite focus:px-4 focus:py-3 focus:text-snow">Skip to content</a>
        <Grain />
        <SmoothScroll />
        <Loader line={profile.hero.lines.join(" ")} />
        <Nav name={profile.name} items={navItems()} email={profile.email} closing={profile.closing.join(" ")} />
        <main id="main" className="relative z-[1]">{children}</main>
        <Footer />
        <Cursor />
      </body>
    </html>
  );
}
