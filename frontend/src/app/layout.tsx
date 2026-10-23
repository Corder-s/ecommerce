import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GauShilp OS — Sacred Vedic Handcrafted E-Commerce & Gaushala SaaS",
  description: "A premium, fluid, modern e-commerce operating system for Indian artisans, gaushalas, and sacred handmade products.",
  keywords: [
    "GauShilp OS",
    "Gaushala SaaS",
    "Handmade Diyas",
    "Organic Dhoop",
    "Panchgavya",
    "Indian Artisans",
    "Sacred Puja Kits",
    "Vedic Crafts",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakartaSans.variable}>
      <body>
        <div className="ambient-canvas" aria-hidden="true">
          <div className="ambient-orb orb-indigo orb-1" />
          <div className="ambient-orb orb-orange orb-2" />
          <div className="ambient-orb orb-teal orb-3" />
        </div>
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <AppProviders>{children}</AppProviders>
        </div>
      </body>
    </html>
  );
}
