import "./globals.css";
import "./content/content.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";

// Editorial pairing: a characterful serif for display, a clean grotesque for UI,
// a mono for IDs/metadata. Exposed as CSS variables consumed by globals.css.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reviews · Painel Administrativo",
  description: "Módulo administrativo da plataforma Reviews",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
