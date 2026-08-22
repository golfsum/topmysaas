import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://topmysaas.com"),
  title: {
    default: "TopMySaaS | The weekly Top 5 SaaS leaderboard",
    template: "%s | TopMySaaS",
  },
  description:
    "Every active paid SaaS listing is ranked by bid, with the Top 5 highlighted. The board resets every Monday at 00:00 UTC.",
  applicationName: "TopMySaaS",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "TopMySaaS",
    title: "Top 5 SaaS. Ranked by bid.",
    description:
      "Every active paid listing is ranked. The five highest bids stand out until Monday at 00:00 UTC.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top 5 SaaS. Ranked by bid.",
    description:
      "Every active paid listing is ranked. The five highest bids stand out until Monday at 00:00 UTC.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="dark"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
