import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCProvider } from "@web/lib/trpc-client";
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
  title: {
    default: "Brewbit POS — Smart Cafe Management",
    template: "%s | Brewbit POS",
  },
  description:
    "Modern restaurant POS with 3D floor plans, real-time kitchen display, and smart ordering. Built for cafes and restaurants.",
  keywords: [
    "POS",
    "restaurant",
    "cafe",
    "kitchen display",
    "order management",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#1A1816] text-[#EADED2]">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
