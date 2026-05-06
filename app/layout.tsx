import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "wowahdata — TSM accounting dashboard",
  description:
    "Drop your TradeSkillMaster CSVs and see when your auction house actually clears. Per-item sale heatmap, P&L, sell-through. Your data never leaves your browser.",
  applicationName: "wowahdata",
  openGraph: {
    title: "wowahdata — TSM accounting dashboard",
    description:
      "Drop your TradeSkillMaster CSVs and see when your auction house actually clears.",
    type: "website",
    siteName: "wowahdata",
  },
  twitter: {
    card: "summary_large_image",
    title: "wowahdata — TSM accounting dashboard",
    description: "Drop your TSM CSVs · your data never leaves your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#1a1a1a] text-[#e0e0e0]">{children}</body>
    </html>
  );
}
