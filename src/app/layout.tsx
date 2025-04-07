import type { Metadata } from "next";
import { Geist, Geist_Mono, Silkscreen, Press_Start_2P } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TORY - AI Insights for Tokenomics, Unlocks & Financials",
  description: "TORY is a smart assistant that provides AI-generated insights for tokenomics, unlock events, and financial metrics in Web3 projects.",
  keywords: [
    "TORY",
    "crypto analysis",
    "tokenomics",
    "web3 analytics",
    "AI token insights",
    "token unlocks",
    "crypto financials",
    "decentralized AI",
    "blockchain analytics"
  ],
  icons: {
    icon: "/favicon.ico"
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
