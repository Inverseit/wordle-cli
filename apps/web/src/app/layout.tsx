import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageShell } from "../components/PageShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wordle(6) — Kazakh Entropy Playground",
  description:
    "Experiment with a Kazakh Wordle(6) board and entropy-driven solver visualizations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kk">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-app h-full`}
      >
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
