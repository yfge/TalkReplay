import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { AppProviders } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Agents Chat Viewer",
  description:
    "Cross-platform viewer for Claude and Codex chat transcripts with filtering and analytics.",
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
