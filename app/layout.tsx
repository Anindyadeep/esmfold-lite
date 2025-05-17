import React from "react";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "../lib/utils";
import { PostHogProvider } from "./components/PostHogProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ESMFold Lite",
  description: "A lightweight interface for ESMFold protein structure prediction",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://litefold.vercel.app'),
  robots: {
    index: true,
    follow: true,
  },
  authors: [
    {
      name: "ESMFold Lite Team",
    },
  ],
  openGraph: {
    title: "ESMFold Lite",
    description: "A lightweight interface for ESMFold protein structure prediction",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*;" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-gradient-to-b from-background to-background/95 font-sans antialiased",
          inter.variable,
          outfit.variable,
          plusJakarta.variable
        )}
      >
        <PostHogProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none"></div>
            <main className="container mx-auto flex-1 space-y-8 px-5 py-10 md:px-8 lg:py-12 relative z-10">
              {children}
            </main>
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}