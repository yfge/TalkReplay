import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import "highlight.js/styles/github.css";

import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TalkReplay",
  description:
    "Vibe coding replay hub for Claude and Codex transcripts with filters, stats, and sharing tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
